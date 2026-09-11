class SyncRepo {
  constructor(db) {
    this.db = db;
  }

  getState(store_id, resource) {
    return this.db.prepare(`
      SELECT * FROM sync_state WHERE store_id = ? AND resource = ?
    `).get(store_id, resource);
  }

  getAllStates(store_id) {
    return this.db.prepare(`
      SELECT * FROM sync_state WHERE store_id = ?
    `).all(store_id);
  }

  setState({ store_id, resource, cursor, watermark, last_error = null, backfill_done = 0 }) {
    const stmt = this.db.prepare(`
      INSERT INTO sync_state (store_id, resource, cursor, watermark, last_run_at, last_error, backfill_done)
      VALUES (?, ?, ?, ?, datetime('now'), ?, ?)
      ON CONFLICT(store_id, resource) DO UPDATE SET
        cursor = excluded.cursor,
        watermark = COALESCE(excluded.watermark, sync_state.watermark),
        last_run_at = datetime('now'),
        last_error = excluded.last_error,
        backfill_done = excluded.backfill_done
    `);
    return stmt.run(store_id, resource, cursor, watermark, last_error, backfill_done);
  }

  log({ store_id, resource, type, message, details = '' }) {
    const stmt = this.db.prepare(`
      INSERT INTO sync_logs (store_id, resource, type, message, details)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(store_id, resource, type, message, typeof details === 'object' ? JSON.stringify(details) : details);
  }

  getRecentLogs(limit = 100) {
    return this.db.prepare(`
      SELECT l.*, s.label AS store_label, s.platform AS store_platform
      FROM sync_logs l
      LEFT JOIN stores s ON s.id = l.store_id
      ORDER BY l.id DESC
      LIMIT ?
    `).all(limit);
  }

  clearLogs() {
    return this.db.prepare('DELETE FROM sync_logs').run();
  }
}

module.exports = SyncRepo;
