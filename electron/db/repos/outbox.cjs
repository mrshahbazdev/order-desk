class OutboxRepo {
  constructor(db) {
    this.db = db;
  }

  enqueue(store_id, kind, payload) {
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const stmt = this.db.prepare(`
      INSERT INTO outbox (store_id, kind, payload, attempts, next_try_at, status)
      VALUES (?, ?, ?, 0, datetime('now'), 'pending')
    `);
    const info = stmt.run(store_id, kind, payloadStr);
    return info.lastInsertRowid;
  }

  getPending(limit = 10) {
    return this.db.prepare(`
      SELECT o.*, s.platform, s.domain, s.credential_id
      FROM outbox o
      JOIN stores s ON s.id = o.store_id
      WHERE o.status = 'pending' AND (o.next_try_at IS NULL OR o.next_try_at <= datetime('now'))
      ORDER BY o.id ASC
      LIMIT ?
    `).all(limit);
  }

  listAll({ limit = 50, status } = {}) {
    let query = `
      SELECT o.*, s.label AS store_label, s.platform AS store_platform
      FROM outbox o
      JOIN stores s ON s.id = o.store_id
    `;
    const params = [];
    if (status && status !== 'all') {
      query += ' WHERE o.status = ?';
      params.push(status);
    }
    query += ' ORDER BY o.id DESC LIMIT ?';
    params.push(limit);

    return this.db.prepare(query).all(...params);
  }

  markProcessing(id) {
    this.db.prepare("UPDATE outbox SET status = 'processing' WHERE id = ?").run(id);
  }

  markDone(id) {
    this.db.prepare("UPDATE outbox SET status = 'done', error = NULL WHERE id = ?").run(id);
  }

  markFailed(id, errorMessage, attempts) {
    // Exponential backoff calculation with jitter: 1s, 4s, 15s, 60s, 5m...
    const backoffSeconds = Math.min(300, Math.pow(2, attempts) * 2 + Math.floor(Math.random() * 3));
    const nextTry = new Date(Date.now() + backoffSeconds * 1000).toISOString().replace('T', ' ').substring(0, 19);

    if (attempts >= 8) {
      // Park job
      this.db.prepare(`
        UPDATE outbox 
        SET status = 'failed', attempts = ?, error = ?, next_try_at = NULL
        WHERE id = ?
      `).run(attempts, errorMessage, id);
    } else {
      this.db.prepare(`
        UPDATE outbox 
        SET status = 'pending', attempts = ?, error = ?, next_try_at = ?
        WHERE id = ?
      `).run(attempts, errorMessage, nextTry, id);
    }
  }

  retryJob(id) {
    return this.db.prepare(`
      UPDATE outbox 
      SET status = 'pending', attempts = 0, next_try_at = datetime('now'), error = NULL
      WHERE id = ?
    `).run(id);
  }

  deleteJob(id) {
    return this.db.prepare('DELETE FROM outbox WHERE id = ?').run(id);
  }

  getStats() {
    return {
      pending: this.db.prepare("SELECT COUNT(*) AS c FROM outbox WHERE status = 'pending'").get().c,
      processing: this.db.prepare("SELECT COUNT(*) AS c FROM outbox WHERE status = 'processing'").get().c,
      failed: this.db.prepare("SELECT COUNT(*) AS c FROM outbox WHERE status = 'failed'").get().c,
      done: this.db.prepare("SELECT COUNT(*) AS c FROM outbox WHERE status = 'done'").get().c
    };
  }
}

module.exports = OutboxRepo;
