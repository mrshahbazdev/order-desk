class PickingRepo {
  constructor(db) {
    this.db = db;
  }

  listWaves({ status, limit = 50 } = {}) {
    let q = 'SELECT * FROM pick_waves WHERE 1=1';
    const params = [];
    if (status && status !== 'all') {
      q += ' AND status = ?';
      params.push(status);
    }
    q += ' ORDER BY id DESC LIMIT ?';
    params.push(limit);

    const waves = this.db.prepare(q).all(...params);
    return waves.map(w => {
      const orders = this.db.prepare(`
        SELECT o.id, o.name, o.total, o.currency, o.customer_json, o.placed_at
        FROM pick_wave_orders pwo
        JOIN orders o ON o.id = pwo.order_id
        WHERE pwo.wave_id = ?
      `).all(w.id);
      return { ...w, orders };
    });
  }

  getWaveDetails(waveId) {
    const wave = this.db.prepare('SELECT * FROM pick_waves WHERE id = ?').get(waveId);
    if (!wave) return null;

    const orderRows = this.db.prepare(`
      SELECT o.id, o.name, o.number, o.financial, o.fulfillment, o.placed_at, o.ship_json
      FROM pick_wave_orders pwo
      JOIN orders o ON o.id = pwo.order_id
      WHERE pwo.wave_id = ?
      ORDER BY o.id ASC
    `).all(waveId);

    const orderIds = orderRows.map(o => o.id);
    let itemsAggregated = [];

    if (orderIds.length > 0) {
      const placeholders = orderIds.map(() => '?').join(',');
      const rawItems = this.db.prepare(`
        SELECT 
          oi.title, oi.variant, oi.sku, oi.image_url,
          SUM(oi.qty) as total_qty,
          COUNT(DISTINCT oi.order_id) as order_count,
          GROUP_CONCAT(DISTINCT o.name) as order_names,
          pl.zone, pl.rack, pl.shelf, pl.bin
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        LEFT JOIN variants v ON (v.sku = oi.sku AND v.sku != '') OR (v.title = oi.variant)
        LEFT JOIN product_locations pl ON pl.variant_id = v.id
        WHERE oi.order_id IN (${placeholders})
        GROUP BY oi.title, oi.variant, oi.sku
        ORDER BY pl.zone ASC, pl.rack ASC, pl.shelf ASC, oi.title ASC
      `).all(...orderIds);

      itemsAggregated = rawItems;
    }

    return {
      wave,
      orders: orderRows,
      items: itemsAggregated
    };
  }

  createWave({ order_ids = [], created_by = 'Warehouse Supervisor' }) {
    if (!order_ids.length) throw new Error('No orders selected for wave picking');

    const waveNumber = `WAVE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    const tx = this.db.transaction(() => {
      const placeholders = order_ids.map(() => '?').join(',');
      const countRow = this.db.prepare(`
        SELECT COUNT(*) as order_count, COALESCE(SUM(qty), 0) as total_items
        FROM order_items
        WHERE order_id IN (${placeholders})
      `).get(...order_ids);

      const info = this.db.prepare(`
        INSERT INTO pick_waves (wave_number, total_orders, total_items, status, created_by, created_at)
        VALUES (?, ?, ?, 'pending', ?, datetime('now'))
      `).run(waveNumber, order_ids.length, countRow.total_items, created_by);

      const waveId = info.lastInsertRowid;
      const insertOrder = this.db.prepare('INSERT INTO pick_wave_orders (wave_id, order_id) VALUES (?, ?)');

      for (const oId of order_ids) {
        insertOrder.run(waveId, oId);
      }

      return waveId;
    });

    const waveId = tx();
    return this.getWaveDetails(waveId);
  }

  updateWaveStatus(waveId, status) {
    const completedAt = status === 'completed' ? "datetime('now')" : null;
    this.db.prepare(`
      UPDATE pick_waves SET status = ?, completed_at = ${completedAt ? "datetime('now')" : 'completed_at'}
      WHERE id = ?
    `).run(status, waveId);
    return this.getWaveDetails(waveId);
  }

  // Bin & Rack Location Management
  listLocations({ search = '' } = {}) {
    let q = `
      SELECT v.id as variant_id, v.title as variant_title, v.sku, v.barcode, v.stock,
             p.id as product_id, p.title as product_title, p.image_url,
             COALESCE(pl.zone, 'A') as zone,
             COALESCE(pl.rack, '01') as rack,
             COALESCE(pl.shelf, '1') as shelf,
             COALESCE(pl.bin, 'B-01') as bin
      FROM variants v
      JOIN products p ON p.id = v.product_id
      LEFT JOIN product_locations pl ON pl.variant_id = v.id
      WHERE 1=1
    `;
    const params = [];
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      q += ' AND (v.sku LIKE ? OR v.title LIKE ? OR p.title LIKE ? OR pl.bin LIKE ? OR pl.zone LIKE ?)';
      params.push(s, s, s, s, s);
    }
    q += ' ORDER BY pl.zone ASC, pl.rack ASC, pl.shelf ASC, p.title ASC LIMIT 200';
    return this.db.prepare(q).all(...params);
  }

  saveLocation({ variant_id, zone = 'A', rack = '01', shelf = '1', bin = 'B-01' }) {
    this.db.prepare(`
      INSERT INTO product_locations (variant_id, zone, rack, shelf, bin, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(variant_id) DO UPDATE SET
        zone = excluded.zone,
        rack = excluded.rack,
        shelf = excluded.shelf,
        bin = excluded.bin,
        updated_at = datetime('now')
    `).run(variant_id, zone, rack, shelf, bin);

    return this.db.prepare('SELECT * FROM product_locations WHERE variant_id = ?').get(variant_id);
  }
}

module.exports = PickingRepo;
