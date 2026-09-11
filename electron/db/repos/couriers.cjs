const vault = require('../../security/vault.cjs');

class CouriersRepo {
  constructor(db) {
    this.db = db;
    this.ensureDefaultCouriers();
  }

  ensureDefaultCouriers() {
    const count = this.db.prepare('SELECT COUNT(*) as c FROM couriers').get().c;
    if (count > 0) return;

    const defaults = [
      { code: 'DHL', name: 'DHL Express', category: 'international', country: 'Global', tracking_url_template: 'https://www.dhl.com/en/express/tracking.html?AWB={{tracking_number}}' },
      { code: 'FEDEX', name: 'FedEx CrossBorder', category: 'international', country: 'Global', tracking_url_template: 'https://www.fedex.com/fedextrack/?trknbr={{tracking_number}}' },
      { code: 'UPS', name: 'UPS Global', category: 'international', country: 'Global', tracking_url_template: 'https://www.ups.com/track?tracknum={{tracking_number}}' },
      { code: 'USPS', name: 'USPS Priority', category: 'international', country: 'USA', tracking_url_template: 'https://tools.usps.com/go/TrackConfirmAction?tLabels={{tracking_number}}' },
      { code: 'ROYALMAIL', name: 'Royal Mail International', category: 'international', country: 'UK', tracking_url_template: 'https://www.royalmail.com/track-your-item#/tracking-results/{{tracking_number}}' },
      { code: 'ARAMEX', name: 'Aramex International', category: 'international', country: 'Middle East & Global', tracking_url_template: 'https://www.aramex.com/track/results?shipmentNumber={{tracking_number}}' },
      { code: 'POSTEX', name: 'PostEx Logistics', category: 'regional', country: 'Pakistan', tracking_url_template: 'https://postex.pk/tracking?cn={{tracking_number}}' },
      { code: 'TRAX', name: 'Trax Logistics', category: 'regional', country: 'Pakistan', tracking_url_template: 'https://sonic.pk/tracking?tracking_number={{tracking_number}}' },
      { code: 'TCS', name: 'TCS Express', category: 'regional', country: 'Pakistan', tracking_url_template: 'https://www.tcsexpress.com/track/{{tracking_number}}' },
      { code: 'LEOPARD', name: 'Leopards Courier', category: 'regional', country: 'Pakistan', tracking_url_template: 'https://leopardscourier.com/tracking/{{tracking_number}}' },
      { code: 'MNP', name: 'M&P Express Logistics', category: 'regional', country: 'Pakistan', tracking_url_template: 'https://mulphilog.com/tracking/{{tracking_number}}' },
      { code: 'BLUEDART', name: 'Blue Dart Express', category: 'regional', country: 'India', tracking_url_template: 'https://www.bluedart.com/tracking?handler=tnt&trackNumber={{tracking_number}}' },
      { code: 'DELHIVERY', name: 'Delhivery Surface', category: 'regional', country: 'India', tracking_url_template: 'https://www.delhivery.com/track/package/{{tracking_number}}' }
    ];

    const insert = this.db.prepare(`
      INSERT INTO couriers (code, name, category, country, tracking_url_template, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);

    for (const c of defaults) {
      insert.run(c.code, c.name, c.category, c.country, c.tracking_url_template);
    }
  }

  listCouriers({ category, is_active } = {}) {
    let q = `
      SELECT id, code, name, category, country, tracking_url_template, api_endpoint,
             credential_id, is_active, created_at,
             (credential_id IS NOT NULL AND credential_id != '') as hasCredentials
      FROM couriers WHERE 1=1
    `;
    const params = [];
    if (category) {
      q += ' AND category = ?';
      params.push(category);
    }
    if (is_active !== undefined) {
      q += ' AND is_active = ?';
      params.push(is_active ? 1 : 0);
    }
    q += ' ORDER BY id ASC';
    const list = this.db.prepare(q).all(...params);
    return list.map(c => ({
      ...c,
      hasCredentials: Boolean(c.hasCredentials)
    }));
  }

  getById(id) {
    const row = this.db.prepare(`
      SELECT id, code, name, category, country, tracking_url_template, api_endpoint,
             credential_id, is_active, created_at,
             (credential_id IS NOT NULL AND credential_id != '') as hasCredentials
      FROM couriers WHERE id = ?
    `).get(id);
    if (!row) return null;
    return {
      ...row,
      hasCredentials: Boolean(row.hasCredentials)
    };
  }

  getCredentials(courierId) {
    const courier = this.db.prepare('SELECT credential_id FROM couriers WHERE id = ?').get(courierId);
    if (!courier || !courier.credential_id) return null;
    return vault.getSecret(courier.credential_id);
  }

  saveCourier({ id, code, name, category, country, tracking_url_template, api_endpoint, api_key, account_number, is_active }) {
    if (id) {
      const existing = this.db.prepare('SELECT * FROM couriers WHERE id = ?').get(id);
      let targetCredId = existing ? existing.credential_id : null;

      const hasNewKey = api_key !== undefined && api_key !== null && api_key !== '';
      const hasNewAcc = account_number !== undefined && account_number !== null && account_number !== '';

      if (hasNewKey || hasNewAcc) {
        targetCredId = targetCredId || vault.generateSecretId();
        const prevSecrets = targetCredId && existing?.credential_id ? (vault.getSecret(targetCredId) || {}) : {};
        const newSecrets = { ...prevSecrets };
        if (hasNewKey) newSecrets.api_key = api_key;
        if (hasNewAcc) newSecrets.account_number = account_number;
        vault.setSecret(targetCredId, newSecrets);
      }

      this.db.prepare(`
        UPDATE couriers SET
          code = ?, name = ?, category = ?, country = ?,
          tracking_url_template = ?, api_endpoint = ?, credential_id = ?,
          api_key = NULL, account_number = NULL, is_active = ?
        WHERE id = ?
      `).run(code, name, category, country, tracking_url_template, api_endpoint, targetCredId, is_active ? 1 : 0, id);

      return this.getById(id);
    }

    let credId = null;
    const hasKey = api_key && api_key.trim();
    const hasAcc = account_number && account_number.trim();
    if (hasKey || hasAcc) {
      credId = vault.generateSecretId();
      vault.setSecret(credId, {
        api_key: api_key || '',
        account_number: account_number || ''
      });
    }

    const info = this.db.prepare(`
      INSERT INTO couriers (code, name, category, country, tracking_url_template, api_endpoint, credential_id, api_key, account_number, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)
    `).run(code, name, category, country, tracking_url_template, api_endpoint, credId, is_active ? 1 : 0);

    return this.getById(info.lastInsertRowid);
  }

  deleteCourier(id) {
    const courier = this.db.prepare('SELECT credential_id FROM couriers WHERE id = ?').get(id);
    if (courier && courier.credential_id) {
      try {
        vault.deleteSecret(courier.credential_id);
      } catch (e) {
        console.error('Failed to delete courier secret from vault:', e);
      }
    }
    return this.db.prepare('DELETE FROM couriers WHERE id = ?').run(id);
  }



  listShipments({ status, search, limit = 100, offset = 0 } = {}) {
    let q = `
      SELECT s.*, o.name as order_name, o.currency as order_currency
      FROM shipments s
      LEFT JOIN orders o ON o.id = s.order_id
      WHERE 1=1
    `;
    const params = [];
    if (status && status !== 'all') {
      q += ' AND s.status = ?';
      params.push(status);
    }
    if (search && search.trim()) {
      q += ' AND (s.tracking_number LIKE ? OR s.customer_name LIKE ? OR s.customer_phone LIKE ? OR o.name LIKE ?)';
      const sTerm = `%${search.trim()}%`;
      params.push(sTerm, sTerm, sTerm, sTerm);
    }
    q += ' ORDER BY s.id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.db.prepare(q).all(...params);
  }

  bookShipment({ order_id, courier_id, weight_kg = 0.5, service_type = 'Standard Express', cod_amount = 0 }) {
    const order = this.db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
    if (!order) throw new Error('Order not found');

    const courier = this.db.prepare('SELECT * FROM couriers WHERE id = ?').get(courier_id);
    if (!courier) throw new Error('Courier not found');

    // Parse shipping address
    let customerName = 'Customer';
    let customerPhone = order.phone || '';
    let destCity = 'Lahore';
    let destCountry = 'Pakistan';

    try {
      const shipAddr = JSON.parse(order.ship_json || '{}');
      customerName = shipAddr.name || (shipAddr.first_name ? `${shipAddr.first_name} ${shipAddr.last_name || ''}`.trim() : order.name);
      if (shipAddr.phone) customerPhone = shipAddr.phone;
      if (shipAddr.city) destCity = shipAddr.city;
      if (shipAddr.country) destCountry = shipAddr.country;
    } catch (e) {}

    const randNum = Math.floor(10000000 + Math.random() * 90000000);
    const trackingNumber = `${courier.code.toUpperCase()}-${randNum}`;

    const info = this.db.prepare(`
      INSERT INTO shipments (
        order_id, courier_id, tracking_number, status, carrier_name, service_type,
        weight_kg, cod_amount, shipping_fee, destination_city, destination_country,
        customer_name, customer_phone, booked_at
      ) VALUES (?, ?, ?, 'booked', ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      order_id,
      courier_id,
      trackingNumber,
      courier.name,
      service_type,
      weight_kg,
      cod_amount || (order.financial !== 'paid' ? order.total : 0),
      order.shipping || 0,
      destCity,
      destCountry,
      customerName,
      customerPhone
    );

    // Update order fulfillment status to fulfilled and add tracking
    this.db.prepare(`
      UPDATE orders SET fulfillment = 'fulfilled', updated_at = datetime('now') WHERE id = ?
    `).run(order_id);

    return this.db.prepare('SELECT * FROM shipments WHERE id = ?').get(info.lastInsertRowid);
  }

  updateShipmentStatus(shipmentId, status) {
    const deliveredAt = status === 'delivered' ? "datetime('now')" : null;
    this.db.prepare(`
      UPDATE shipments SET status = ?, delivered_at = ${deliveredAt ? "datetime('now')" : 'delivered_at'}
      WHERE id = ?
    `).run(status, shipmentId);
    return this.db.prepare('SELECT * FROM shipments WHERE id = ?').get(shipmentId);
  }

  // COD & Remittance Reconciliations
  listReconciliations() {
    return this.db.prepare(`
      SELECT r.*, c.name as courier_name, c.code as courier_code
      FROM cod_reconciliations r
      LEFT JOIN couriers c ON c.id = r.courier_id
      ORDER BY r.id DESC
    `).all();
  }

  createReconciliation({ courier_id, statement_ref, total_orders = 0, expected_amount = 0, received_amount = 0, courier_charges = 0, notes = '' }) {
    const diff = (expected_amount - courier_charges) - received_amount;
    const status = Math.abs(diff) < 5 ? 'settled' : 'disputed';

    const info = this.db.prepare(`
      INSERT INTO cod_reconciliations (
        courier_id, statement_ref, total_orders, expected_amount, received_amount,
        courier_charges, difference_amount, status, settlement_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
    `).run(
      courier_id,
      statement_ref || `STMT-${Date.now().toString().slice(-6)}`,
      total_orders,
      expected_amount,
      received_amount,
      courier_charges,
      diff,
      status,
      notes
    );

    return this.db.prepare('SELECT * FROM cod_reconciliations WHERE id = ?').get(info.lastInsertRowid);
  }

  getMetrics() {
    const totalBooked = this.db.prepare("SELECT COUNT(*) as c FROM shipments WHERE status = 'booked'").get().c;
    const inTransit = this.db.prepare("SELECT COUNT(*) as c FROM shipments WHERE status = 'in_transit'").get().c;
    const delivered = this.db.prepare("SELECT COUNT(*) as c FROM shipments WHERE status = 'delivered'").get().c;
    const returned = this.db.prepare("SELECT COUNT(*) as c FROM shipments WHERE status = 'returned'").get().c;
    const pendingCod = this.db.prepare("SELECT COALESCE(SUM(cod_amount), 0) as s FROM shipments WHERE status IN ('booked', 'in_transit', 'out_for_delivery')").get().s;
    const collectedCod = this.db.prepare("SELECT COALESCE(SUM(cod_amount), 0) as s FROM shipments WHERE status = 'delivered'").get().s;

    return {
      totalBooked,
      inTransit,
      delivered,
      returned,
      pendingCod,
      collectedCod
    };
  }
}

module.exports = CouriersRepo;
