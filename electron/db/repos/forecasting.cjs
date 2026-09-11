class ForecastingRepo {
  constructor(db) {
    this.db = db;
  }

  getInventoryForecast({ daysLookback = 30 } = {}) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysLookback);
    const cutoffIso = cutoffDate.toISOString();

    const variants = this.db.prepare(`
      SELECT 
        v.id as variant_id, v.title as variant_title, v.sku, v.barcode, v.stock, v.price,
        p.id as product_id, p.title as product_title, p.vendor, p.image_url,
        COALESCE((
          SELECT SUM(oi.qty) 
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE (oi.sku = v.sku AND v.sku != '') AND o.placed_at >= ?
        ), 0) as units_sold_period
      FROM variants v
      JOIN products p ON p.id = v.product_id
      ORDER BY v.stock ASC
    `).all(cutoffIso);

    return variants.map(item => {
      const dailyVelocity = item.units_sold_period > 0 ? (item.units_sold_period / daysLookback) : 0;
      const daysOfStock = dailyVelocity > 0 ? Math.round(item.stock / dailyVelocity) : (item.stock > 0 ? 999 : 0);
      const reorderStatus = item.stock === 0 ? 'critical_out' : daysOfStock <= 7 ? 'reorder_now' : daysOfStock <= 15 ? 'warning_low' : 'healthy';
      const recommendedReorderQty = Math.max(0, Math.ceil((dailyVelocity * 30) - item.stock));

      return {
        ...item,
        dailyVelocity: parseFloat(dailyVelocity.toFixed(2)),
        daysOfStock,
        reorderStatus,
        recommendedReorderQty
      };
    });
  }

  listPurchaseOrders({ status } = {}) {
    let q = 'SELECT * FROM purchase_orders WHERE 1=1';
    const params = [];
    if (status && status !== 'all') {
      q += ' AND status = ?';
      params.push(status);
    }
    q += ' ORDER BY id DESC';

    const pos = this.db.prepare(q).all(...params);
    return pos.map(po => {
      const items = this.db.prepare('SELECT * FROM purchase_order_items WHERE po_id = ?').all(po.id);
      return { ...po, items };
    });
  }

  createPurchaseOrder({
    supplier_name,
    supplier_email = '',
    supplier_phone = '',
    expected_delivery = '',
    notes = '',
    items = []
  }) {
    if (!supplier_name || !supplier_name.trim()) throw new Error('Supplier name is required');

    const poNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    const tx = this.db.transaction(() => {
      let totalAmount = 0;
      for (const it of items) {
        totalAmount += (Number(it.qty_ordered) || 1) * (Number(it.unit_cost) || 0);
      }

      const info = this.db.prepare(`
        INSERT INTO purchase_orders (po_number, supplier_name, supplier_email, supplier_phone, total_amount, expected_delivery, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(poNumber, supplier_name, supplier_email, supplier_phone, totalAmount, expected_delivery, notes);

      const poId = info.lastInsertRowid;
      const insertItem = this.db.prepare(`
        INSERT INTO purchase_order_items (po_id, variant_id, item_title, sku, qty_ordered, qty_received, unit_cost)
        VALUES (?, ?, ?, ?, ?, 0, ?)
      `);

      for (const it of items) {
        insertItem.run(
          poId,
          it.variant_id || null,
          it.item_title || 'Item',
          it.sku || '',
          Number(it.qty_ordered) || 1,
          Number(it.unit_cost) || 0
        );
      }

      return poId;
    });

    const poId = tx();
    return this.getPurchaseOrder(poId);
  }

  getPurchaseOrder(poId) {
    const po = this.db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(poId);
    if (!po) return null;
    const items = this.db.prepare('SELECT * FROM purchase_order_items WHERE po_id = ?').all(poId);
    return { ...po, items };
  }

  receiveStock(poId, itemReceipts = []) {
    const tx = this.db.transaction(() => {
      for (const receipt of itemReceipts) {
        const { item_id, qty_received } = receipt;
        if (!item_id || !qty_received) continue;

        const poItem = this.db.prepare('SELECT * FROM purchase_order_items WHERE id = ? AND po_id = ?').get(item_id, poId);
        if (poItem) {
          const newReceived = poItem.qty_received + qty_received;
          this.db.prepare('UPDATE purchase_order_items SET qty_received = ? WHERE id = ?').run(newReceived, item_id);

          // Add to inventory variant stock if variant_id exists
          if (poItem.variant_id) {
            this.db.prepare('UPDATE variants SET stock = stock + ? WHERE id = ?').run(qty_received, poItem.variant_id);
            const v = this.db.prepare('SELECT product_id FROM variants WHERE id = ?').get(poItem.variant_id);
            if (v && v.product_id) {
              this.db.prepare("UPDATE products SET updated_at = datetime('now') WHERE id = ?").run(v.product_id);
            }
          }
        }
      }

      // Check if all items received
      const allItems = this.db.prepare('SELECT qty_ordered, qty_received FROM purchase_order_items WHERE po_id = ?').all(poId);
      const allDone = allItems.every(i => i.qty_received >= i.qty_ordered);
      const anyDone = allItems.some(i => i.qty_received > 0);
      const newStatus = allDone ? 'received' : anyDone ? 'partially_received' : 'ordered';

      this.db.prepare(`
        UPDATE purchase_orders SET status = ?, received_at = ${allDone ? "datetime('now')" : 'received_at'}
        WHERE id = ?
      `).run(newStatus, poId);
    });

    tx();
    return this.getPurchaseOrder(poId);
  }
}

module.exports = ForecastingRepo;
