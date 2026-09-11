class StaffRepo {
  constructor(db) {
    this.db = db;
    this.ensureDefaultStaff();
  }

  ensureDefaultStaff() {
    const count = this.db.prepare('SELECT COUNT(*) as c FROM staff_members').get().c;
    if (count > 0) return;

    const defaults = [
      { name: 'Lead Operator', role: 'Packer', employee_code: 'EMP-101', pin_code: '1234' },
      { name: 'Station Assistant', role: 'Picker', employee_code: 'EMP-102', pin_code: '5678' },
      { name: 'Shift Supervisor', role: 'Supervisor', employee_code: 'EMP-103', pin_code: '9900' }
    ];

    const insert = this.db.prepare('INSERT INTO staff_members (name, role, employee_code, pin_code, is_active) VALUES (?, ?, ?, ?, 1)');
    for (const s of defaults) {
      insert.run(s.name, s.role, s.employee_code, s.pin_code);
    }
  }

  listStaff({ is_active } = {}) {
    let q = 'SELECT * FROM staff_members WHERE 1=1';
    const params = [];
    if (is_active !== undefined) {
      q += ' AND is_active = ?';
      params.push(is_active ? 1 : 0);
    }
    q += ' ORDER BY id ASC';
    return this.db.prepare(q).all(...params);
  }

  saveStaff({ id, name, role, employee_code, pin_code, is_active }) {
    if (id) {
      this.db.prepare(`
        UPDATE staff_members SET
          name = ?, role = ?, employee_code = ?, pin_code = ?, is_active = ?
        WHERE id = ?
      `).run(name, role, employee_code, pin_code, is_active ? 1 : 0, id);
      return this.db.prepare('SELECT * FROM staff_members WHERE id = ?').get(id);
    }

    const info = this.db.prepare(`
      INSERT INTO staff_members (name, role, employee_code, pin_code, is_active)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, role, employee_code, pin_code, is_active ? 1 : 0);
    return this.db.prepare('SELECT * FROM staff_members WHERE id = ?').get(info.lastInsertRowid);
  }

  logPackAudit({
    order_id,
    staff_id,
    staff_name,
    duration_seconds = 0,
    items_packed = 1,
    package_weight_g = 0,
    verification_status = 'verified'
  }) {
    const info = this.db.prepare(`
      INSERT INTO pack_audit_logs (
        order_id, staff_id, staff_name, duration_seconds, items_packed,
        package_weight_g, verification_status, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      order_id || null,
      staff_id || null,
      staff_name || 'Operator',
      duration_seconds,
      items_packed,
      package_weight_g,
      verification_status
    );

    return this.db.prepare('SELECT * FROM pack_audit_logs WHERE id = ?').get(info.lastInsertRowid);
  }

  listAuditLogs({ limit = 100 } = {}) {
    return this.db.prepare(`
      SELECT l.*, o.name as order_name
      FROM pack_audit_logs l
      LEFT JOIN orders o ON o.id = l.order_id
      ORDER BY l.id DESC
      LIMIT ?
    `).all(limit);
  }

  getStaffAnalytics() {
    const totalParcelsPacked = this.db.prepare('SELECT COUNT(*) as c FROM pack_audit_logs').get().c;
    const avgDurationRow = this.db.prepare('SELECT AVG(duration_seconds) as avg_d FROM pack_audit_logs WHERE duration_seconds > 0').get();
    const avgDuration = Math.round(avgDurationRow?.avg_d || 0);

    const operatorLeaderboard = this.db.prepare(`
      SELECT 
        staff_name,
        COUNT(*) as parcels_packed,
        SUM(items_packed) as total_items,
        AVG(duration_seconds) as avg_duration_sec
      FROM pack_audit_logs
      GROUP BY staff_name
      ORDER BY parcels_packed DESC
    `).all();

    return {
      totalParcelsPacked,
      avgDuration,
      operatorLeaderboard
    };
  }
}

module.exports = StaffRepo;
