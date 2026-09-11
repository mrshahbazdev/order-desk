class ReturnsRepo {
  constructor(db) {
    this.db = db;
  }

  list({ reason, condition_status, search, limit = 100, offset = 0 } = {}) {
    let q = `
      SELECT r.*, o.name as order_name, o.placed_at as order_placed_at
      FROM order_returns r
      LEFT JOIN orders o ON o.id = r.order_id
      WHERE 1=1
    `;
    const params = [];

    if (reason && reason !== 'all') {
      q += ' AND r.reason = ?';
      params.push(reason);
    }
    if (condition_status && condition_status !== 'all') {
      q += ' AND r.condition_status = ?';
      params.push(condition_status);
    }
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      q += ' AND (r.order_number LIKE ? OR r.tracking_number LIKE ? OR r.sku LIKE ? OR r.item_title LIKE ? OR r.customer_name LIKE ?)';
      params.push(term, term, term, term, term);
    }

    q += ' ORDER BY r.id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.db.prepare(q).all(...params);
  }

  processReturn({
    order_id,
    order_number,
    tracking_number,
    variant_id,
    item_title,
    variant_title = '',
    sku = '',
    qty = 1,
    reason = 'size_fit',
    condition_status = 'resellable',
    restock = true,
    customer_name = '',
    customer_phone = '',
    received_by = 'Pack Station Staff',
    notes = ''
  }) {
    const tx = this.db.transaction(() => {
      // 1. If variant exists and restock is checked, increment inventory stock
      let finalVariantId = variant_id;
      if (!finalVariantId && sku) {
        const found = this.db.prepare('SELECT id FROM variants WHERE sku = ? LIMIT 1').get(sku);
        if (found) finalVariantId = found.id;
      }

      if (restock && finalVariantId) {
        this.db.prepare('UPDATE variants SET stock = stock + ? WHERE id = ?').run(qty, finalVariantId);
        const v = this.db.prepare('SELECT product_id FROM variants WHERE id = ?').get(finalVariantId);
        if (v && v.product_id) {
          this.db.prepare("UPDATE products SET updated_at = datetime('now') WHERE id = ?").run(v.product_id);
        }
      }

      // 2. Insert order return record
      const info = this.db.prepare(`
        INSERT INTO order_returns (
          order_id, order_number, tracking_number, variant_id, item_title, variant_title,
          sku, qty, reason, condition_status, restocked, customer_name, customer_phone,
          received_by, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        order_id || null,
        order_number || '',
        tracking_number || '',
        finalVariantId || null,
        item_title || 'Returned Item',
        variant_title || '',
        sku || '',
        qty,
        reason,
        condition_status,
        restock ? 1 : 0,
        customer_name || '',
        customer_phone || '',
        received_by || '',
        notes || ''
      );

      // 3. Mark matching shipment status if tracking matches
      if (tracking_number) {
        this.db.prepare("UPDATE shipments SET status = 'returned' WHERE tracking_number = ?").run(tracking_number);
      }

      // 4. Mark order as returned if order_id is present
      if (order_id) {
        this.db.prepare("UPDATE orders SET fulfillment = 'restocked', note = note || ' [Returned & Processed]' WHERE id = ?").run(order_id);
      }

      return this.db.prepare('SELECT * FROM order_returns WHERE id = ?').get(info.lastInsertRowid);
    });

    return tx();
  }

  getAnalytics() {
    const totalReturns = this.db.prepare('SELECT COUNT(*) as c FROM order_returns').get().c;
    const restockedCount = this.db.prepare('SELECT COUNT(*) as c FROM order_returns WHERE restocked = 1').get().c;
    const damagedCount = this.db.prepare("SELECT COUNT(*) as c FROM order_returns WHERE condition_status = 'damaged'").get().c;

    const byReason = this.db.prepare(`
      SELECT reason, COUNT(*) as count 
      FROM order_returns 
      GROUP BY reason 
      ORDER BY count DESC
    `).all();

    const topReturnedItems = this.db.prepare(`
      SELECT item_title, sku, SUM(qty) as total_qty 
      FROM order_returns 
      GROUP BY item_title, sku 
      ORDER BY total_qty DESC 
      LIMIT 10
    `).all();

    return {
      totalReturns,
      restockedCount,
      damagedCount,
      byReason,
      topReturnedItems
    };
  }
}

module.exports = ReturnsRepo;
