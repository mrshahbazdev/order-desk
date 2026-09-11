class SettingsRepo {
  constructor(db) {
    this.db = db;
  }

  get(key, defaultValue = null) {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    if (!row || row.value === null || row.value === undefined) return defaultValue;
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  }

  getAll() {
    const rows = this.db.prepare('SELECT key, value FROM settings').all();
    const result = {};
    for (const r of rows) {
      try {
        result[r.key] = JSON.parse(r.value);
      } catch {
        result[r.key] = r.value;
      }
    }
    return result;
  }

  set(key, value) {
    const strVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
    this.db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, strVal);
    return value;
  }

  delete(key) {
    return this.db.prepare('DELETE FROM settings WHERE key = ?').run(key);
  }
}

module.exports = SettingsRepo;
