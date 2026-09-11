const fs = require('fs');

class DocumentsRepo {
  constructor(db) {
    this.db = db;
  }

  create({ store_id, order_id, kind, number, path }) {
    const stmt = this.db.prepare(`
      INSERT INTO documents (store_id, order_id, kind, number, path)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(store_id || null, order_id || null, kind, number || null, path || null);
    return this.getById(info.lastInsertRowid);
  }

  getById(id) {
    return this.db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
  }

  getByOrder(order_id, kind = null) {
    if (kind) {
      return this.db.prepare('SELECT * FROM documents WHERE order_id = ? AND kind = ? ORDER BY id DESC').all(order_id, kind);
    }
    return this.db.prepare('SELECT * FROM documents WHERE order_id = ? ORDER BY id DESC').all(order_id);
  }

  list({ limit = 100, kind = null } = {}) {
    let query = `
      SELECT d.*, o.name as order_name, s.label as store_label
      FROM documents d
      LEFT JOIN orders o ON o.id = d.order_id
      LEFT JOIN stores s ON s.id = d.store_id
    `;
    const params = [];
    if (kind && kind !== 'all') {
      query += ' WHERE d.kind = ?';
      params.push(kind);
    }
    query += ' ORDER BY d.id DESC LIMIT ?';
    params.push(limit);

    return this.db.prepare(query).all(...params);
  }

  delete(id) {
    const doc = this.getById(id);
    if (doc) {
      if (doc.path) {
        try {
          if (fs.existsSync(doc.path)) fs.unlinkSync(doc.path);
        } catch (e) {
          console.error('Failed to unlink PDF file:', e);
        }
      }
      this.db.prepare('DELETE FROM documents WHERE id = ?').run(id);
    }
    return { success: true };
  }

  clearAll(kind = null) {
    let query = 'SELECT * FROM documents';
    const params = [];
    if (kind && kind !== 'all') {
      query += ' WHERE kind = ?';
      params.push(kind);
    }
    const docs = this.db.prepare(query).all(...params);
    for (const doc of docs) {
      if (doc.path) {
        try {
          if (fs.existsSync(doc.path)) fs.unlinkSync(doc.path);
        } catch (e) {
          // ignore already unlinked
        }
      }
    }

    if (kind && kind !== 'all') {
      this.db.prepare('DELETE FROM documents WHERE kind = ?').run(kind);
    } else {
      this.db.prepare('DELETE FROM documents').run();
    }
    return { success: true, count: docs.length };
  }

  /**
   * Generates or fetches existing sequential gap-free invoice number for an order.
   * Format configurable e.g. INV-YYYY-0001
   */
  getOrAllocateInvoiceNumber(order_id) {
    const existing = this.db.prepare("SELECT number FROM documents WHERE order_id = ? AND kind = 'invoice' LIMIT 1").get(order_id);
    if (existing && existing.number) {
      return existing.number;
    }

    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    
    const maxRow = this.db.prepare(`
      SELECT number FROM documents 
      WHERE kind = 'invoice' AND number LIKE ?
      ORDER BY id DESC LIMIT 1
    `).get(`${prefix}%`);

    let nextSeq = 1;
    if (maxRow && maxRow.number) {
      const match = maxRow.number.match(/INV-\d{4}-(\d+)/);
      if (match) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    }

    const numStr = String(nextSeq).padStart(4, '0');
    return `${prefix}${numStr}`;
  }
}

module.exports = DocumentsRepo;
