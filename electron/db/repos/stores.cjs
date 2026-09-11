class StoresRepo {
  constructor(db) {
    this.db = db;
  }

  list() {
    return this.db.prepare(`
      SELECT s.*, 
             (SELECT COUNT(*) FROM orders WHERE store_id = s.id) AS order_count,
             (SELECT COUNT(*) FROM products WHERE store_id = s.id) AS product_count,
             (SELECT last_run_at FROM sync_state WHERE store_id = s.id AND resource = 'orders') AS last_orders_sync
      FROM stores s
      ORDER BY s.created_at ASC
    `).all();
  }

  getById(id) {
    return this.db.prepare('SELECT * FROM stores WHERE id = ?').get(id);
  }

  getByDomain(domain) {
    return this.db.prepare('SELECT * FROM stores WHERE domain = ?').get(domain);
  }

  create({ platform, label, domain, currency = 'PKR', timezone = 'UTC', credential_id, status = 'active' }) {
    const cleanDomain = domain.toLowerCase().trim();
    const existing = this.getByDomain(cleanDomain);
    if (existing) {
      this.update(existing.id, {
        platform,
        label,
        currency,
        timezone,
        credential_id,
        status: 'active'
      });
      return this.getById(existing.id);
    }
    const stmt = this.db.prepare(`
      INSERT INTO stores (platform, label, domain, currency, timezone, credential_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(platform, label, cleanDomain, currency, timezone, credential_id, status);
    return this.getById(info.lastInsertRowid);
  }

  update(id, fields) {
    const allowed = ['label', 'currency', 'timezone', 'status', 'credential_id'];
    const sets = [];
    const vals = [];
    for (const [k, v] of Object.entries(fields)) {
      if (allowed.includes(k)) {
        sets.push(`${k} = ?`);
        vals.push(v);
      }
    }
    if (!sets.length) return this.getById(id);
    vals.push(id);
    this.db.prepare(`UPDATE stores SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    return this.getById(id);
  }

  delete(id) {
    return this.db.prepare('DELETE FROM stores WHERE id = ?').run(id);
  }

  updateStatus(id, status) {
    return this.db.prepare('UPDATE stores SET status = ? WHERE id = ?').run(status, id);
  }
}

module.exports = StoresRepo;
