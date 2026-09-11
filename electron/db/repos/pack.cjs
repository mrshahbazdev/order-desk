/**
 * Pack Station data layer.
 *
 * The whole station is driven by one input box and a barcode scanner acting
 * as a keyboard. Every scan is a string; this repo works out what it meant.
 */
class PackRepo {
  constructor(db) {
    this.db = db;
  }

  /**
   * Resolve a scanned string to an order.
   * Scanners at a packing table see order numbers off a picking list, tracking
   * numbers off a label, customer details, or raw IDs.
   */
  findOrderByScan(code) {
    const raw = String(code || '').trim();
    if (!raw) return null;

    // Remove leading #, OD-, etc.
    const bare = raw.replace(/^[#A-Za-z-]*/, '');
    const searchPattern = `%${raw}%`;

    // 1. Direct match on name, remote_id, number, or exact ID
    let order = this.db.prepare(`
      SELECT o.*, s.label AS store_label, s.platform AS store_platform
      FROM orders o
      JOIN stores s ON s.id = o.store_id
      WHERE o.name = ?
         OR o.name = ?
         OR o.remote_id = ?
         OR (o.number IS NOT NULL AND CAST(o.number AS TEXT) = ?)
         OR CAST(o.id AS TEXT) = ?
      ORDER BY (CASE WHEN o.fulfillment IN ('unfulfilled', 'partial') THEN 0 ELSE 1 END), o.placed_at DESC
      LIMIT 1
    `).get(raw, '#' + bare, raw, bare, raw);

    if (order) return order;

    // 2. Search by customer email, phone, customer name in JSON, or partial name
    order = this.db.prepare(`
      SELECT o.*, s.label AS store_label, s.platform AS store_platform
      FROM orders o
      JOIN stores s ON s.id = o.store_id
      WHERE o.name LIKE ?
         OR o.email LIKE ?
         OR o.phone LIKE ?
         OR o.customer_json LIKE ?
      ORDER BY (CASE WHEN o.fulfillment IN ('unfulfilled', 'partial') THEN 0 ELSE 1 END), o.placed_at DESC
      LIMIT 1
    `).get(searchPattern, searchPattern, searchPattern, searchPattern);

    if (order) return order;

    // 3. If an item SKU or barcode was scanned first, find the oldest unfulfilled order containing it
    order = this.db.prepare(`
      SELECT o.*, s.label AS store_label, s.platform AS store_platform
      FROM orders o
      JOIN stores s ON s.id = o.store_id
      JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN variants v ON v.sku = oi.sku
      WHERE (oi.sku = ? OR v.barcode = ?)
        AND o.fulfillment IN ('unfulfilled', 'partial')
      ORDER BY o.placed_at ASC
      LIMIT 1
    `).get(raw, raw);

    return order || null;
  }

  /** Line items plus how many of each have already been verified. */
  getChecklist(orderId, sessionId) {
    const items = this.db.prepare(`
      SELECT oi.id, oi.sku, oi.title, oi.variant, oi.qty, oi.price, oi.image_url,
             (SELECT v.barcode FROM variants v WHERE v.sku = oi.sku LIMIT 1) AS barcode
      FROM order_items oi
      WHERE oi.order_id = ?
      ORDER BY oi.sku IS NULL, oi.sku, oi.id
    `).all(orderId);

    const scanned = sessionId
      ? this.db.prepare(`
          SELECT order_item_id, COUNT(*) AS n
          FROM pack_scans
          WHERE session_id = ? AND result = 'matched'
          GROUP BY order_item_id
        `).all(sessionId)
      : [];

    const counts = new Map(scanned.map((r) => [r.order_item_id, r.n]));

    return items.map((it) => {
      const packedCount = counts.get(it.id) || 0;
      return {
        ...it,
        barcode: it.barcode || (it.sku ? `890${Math.abs(it.sku.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)) % 1000000000}` : ''),
        packed: packedCount,
        complete: packedCount >= it.qty
      };
    });
  }

  startSession(orderId, packer) {
    const order = this.db.prepare('SELECT store_id FROM orders WHERE id = ?').get(orderId);
    if (!order) throw new Error('Order not found');

    // Reuse an open session so closing the app mid-pack doesn't lose progress.
    const existing = this.db.prepare(`
      SELECT * FROM pack_sessions WHERE order_id = ? AND status = 'open'
      ORDER BY id DESC LIMIT 1
    `).get(orderId);
    if (existing) return existing;

    const info = this.db.prepare(`
      INSERT INTO pack_sessions (order_id, store_id, packer) VALUES (?, ?, ?)
    `).run(orderId, order.store_id, packer || null);

    return this.db.prepare('SELECT * FROM pack_sessions WHERE id = ?').get(info.lastInsertRowid);
  }

  /**
   * Record one item scan against an open session.
   * Returns what the UI should say and beep about.
   */
  scanItem(sessionId, code) {
    const raw = String(code || '').trim();
    const session = this.db.prepare('SELECT * FROM pack_sessions WHERE id = ?').get(sessionId);
    if (!session) throw new Error('No open packing session');

    const checklist = this.getChecklist(session.order_id, sessionId);

    const match = checklist.find(
      (it) =>
        (it.barcode && it.barcode === raw) ||
        (it.sku && it.sku.toLowerCase() === raw.toLowerCase()) ||
        (String(it.id) === raw)
    );

    const record = (order_item_id, result) => {
      this.db.prepare(`
        INSERT INTO pack_scans (session_id, order_item_id, code, result)
        VALUES (?, ?, ?, ?)
      `).run(sessionId, order_item_id, raw, result);
    };

    if (!match) {
      record(null, 'unexpected');
      return {
        result: 'unexpected',
        message: 'That item is not on this order',
        code: raw
      };
    }

    if (match.packed >= match.qty) {
      record(match.id, 'overscan');
      return {
        result: 'overscan',
        message: `All ${match.qty} of ${match.sku || match.title} are already packed`,
        item: match
      };
    }

    record(match.id, 'matched');
    const updated = this.getChecklist(session.order_id, sessionId);
    const remaining = updated.reduce((sum, it) => sum + Math.max(0, it.qty - it.packed), 0);

    return {
      result: 'matched',
      item: updated.find((it) => it.id === match.id),
      checklist: updated,
      remaining,
      complete: remaining === 0
    };
  }

  /**
   * Quick manual pack helper (for touch screen or mouse click).
   */
  manualPackItem(sessionId, itemId) {
    const session = this.db.prepare('SELECT * FROM pack_sessions WHERE id = ?').get(sessionId);
    if (!session) throw new Error('No open packing session');

    const item = this.db.prepare('SELECT * FROM order_items WHERE id = ? AND order_id = ?').get(itemId, session.order_id);
    if (!item) throw new Error('Item not found on this order');

    return this.scanItem(sessionId, item.sku || String(item.id));
  }

  /**
   * Create a rich sample demo order to immediately test and demonstrate Pack Station.
   */
  createSampleOrder() {
    let store = this.db.prepare('SELECT * FROM stores LIMIT 1').get();
    if (!store) {
      const info = this.db.prepare(`
        INSERT INTO stores (platform, label, domain, currency, credential_id, status)
        VALUES ('shopify', 'Demo Store', 'demo-store.myshopify.com', 'PKR', 'vault-demo', 'active')
      `).run();
      store = this.db.prepare('SELECT * FROM stores WHERE id = ?').get(info.lastInsertRowid);
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const orderName = `#DEMO-${randomNum}`;
    const remoteId = `demo_ord_${Date.now()}_${randomNum}`;

    const customer = {
      name: 'Muhammad Daniyal',
      first_name: 'Muhammad',
      last_name: 'Daniyal',
      email: `daniyal.${randomNum}@example.com`,
      phone: '+92 300 9876543'
    };

    const shipping = {
      name: 'Muhammad Daniyal',
      address1: 'Plot 42-C, 24th Commercial Street, Phase 2 Ext',
      city: 'Karachi',
      province: 'Sindh',
      zip: '75500',
      country: 'Pakistan',
      phone: '+92 300 9876543'
    };

    const orderInfo = this.db.prepare(`
      INSERT INTO orders (
        store_id, remote_id, name, number, email, phone, financial, fulfillment,
        currency, subtotal, shipping, tax, discount, total,
        customer_json, ship_json, bill_json, tags, note, placed_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, 'paid', 'unfulfilled',
        'PKR', 749900, 25000, 0, 0, 774900,
        ?, ?, ?, 'PackStation Demo, Rush', 'Fragile electronic items. Handle with care.', datetime('now'), datetime('now')
      )
    `).run(
      store.id,
      remoteId,
      orderName,
      randomNum,
      customer.email,
      customer.phone,
      JSON.stringify(customer),
      JSON.stringify(shipping),
      JSON.stringify(shipping)
    );

    const orderId = orderInfo.lastInsertRowid;

    // Create a demo product and variants for barcodes
    let prod = this.db.prepare("SELECT id FROM products WHERE remote_id = 'demo_prod_pack'").get();
    if (!prod) {
      const pInfo = this.db.prepare(`
        INSERT INTO products (store_id, remote_id, title, vendor, type, status)
        VALUES (?, 'demo_prod_pack', 'Electronics & Accessories Bundle', 'LogiGear', 'Accessories', 'active')
      `).run(store.id);
      prod = { id: pInfo.lastInsertRowid };
    }

    const sampleItems = [
      {
        sku: `MOU-ERG-${randomNum}`,
        barcode: `890123456${String(randomNum).slice(0, 3)}1`,
        title: 'Ergonomic Vertical Wireless Mouse (Silent Click)',
        variant: 'Space Grey',
        qty: 2,
        price: 249900,
        image_url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=150'
      },
      {
        sku: `CBL-100W-${randomNum}`,
        barcode: `890123456${String(randomNum).slice(0, 3)}2`,
        title: 'Braided Type-C to Type-C 100W PD Cable (2M)',
        variant: 'Midnight Blue',
        qty: 1,
        price: 100100,
        image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=150'
      },
      {
        sku: `KEY-PBT-${randomNum}`,
        barcode: `890123456${String(randomNum).slice(0, 3)}3`,
        title: 'PBT Double-Shot Custom Keycaps Set (108 Keys)',
        variant: 'Cyberpunk Purple',
        qty: 1,
        price: 150000,
        image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=150'
      }
    ];

    for (const item of sampleItems) {
      this.db.prepare(`
        INSERT INTO order_items (order_id, remote_id, sku, title, variant, qty, price, total, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderId,
        `item_${Date.now()}_${item.sku}`,
        item.sku,
        item.title,
        item.variant,
        item.qty,
        item.price,
        item.price * item.qty,
        item.image_url
      );

      // Add variant with barcode so barcode scan works
      this.db.prepare(`
        INSERT INTO variants (product_id, sku, barcode, title, price, stock)
        VALUES (?, ?, ?, ?, ?, 50)
      `).run(prod.id, item.sku, item.barcode, item.variant, item.price);
    }

    return this.findOrderByScan(orderName);
  }

  /**
   * Get unfulfilled queue for the quick picker drawer/list.
   */
  getUnfulfilledQueue({ limit = 50, search = '', store_id = null, type = 'all' } = {}) {
    const where = ["o.fulfillment IN ('unfulfilled', 'partial')"];
    const params = [];

    if (store_id && store_id !== 'all') {
      where.push('o.store_id = ?');
      params.push(store_id);
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where.push('(o.name LIKE ? OR o.email LIKE ? OR o.phone LIKE ? OR o.customer_json LIKE ? OR o.ship_json LIKE ? OR EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND (oi.title LIKE ? OR oi.sku LIKE ?)))');
      params.push(q, q, q, q, q, q, q);
    }

    if (type === 'single') {
      where.push('(SELECT SUM(qty) FROM order_items WHERE order_id = o.id) = 1');
    } else if (type === 'multi') {
      where.push('(SELECT SUM(qty) FROM order_items WHERE order_id = o.id) > 1');
    } else if (type === 'partial') {
      where.push("o.fulfillment = 'partial'");
    }

    const rows = this.db.prepare(`
      SELECT o.id, o.name, o.email, o.phone, o.total, o.currency, o.financial, o.fulfillment, o.placed_at,
             o.customer_json, o.ship_json, s.label AS store_label, s.platform AS store_platform,
             (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count,
             COALESCE((SELECT SUM(qty) FROM order_items WHERE order_id = o.id), 0) AS total_units,
             (SELECT GROUP_CONCAT(qty || 'x ' || title, ' • ') FROM (SELECT qty, title FROM order_items WHERE order_id = o.id LIMIT 3)) AS items_summary,
             (SELECT GROUP_CONCAT(image_url, '||') FROM (SELECT image_url FROM order_items WHERE order_id = o.id AND image_url IS NOT NULL AND image_url != '' LIMIT 4)) AS item_images
      FROM orders o
      JOIN stores s ON s.id = o.store_id
      WHERE ${where.join(' AND ')}
      ORDER BY o.placed_at ASC
      LIMIT ?
    `).all(...params, limit);

    return rows.map(r => {
      let customer = null;
      let shipping = null;
      try { customer = JSON.parse(r.customer_json); } catch {}
      try { shipping = JSON.parse(r.ship_json); } catch {}
      const images = r.item_images ? r.item_images.split('||').filter(Boolean) : [];
      return {
        ...r,
        customer_name: customer?.name || customer?.first_name || r.email || 'Customer',
        city: shipping?.city || '',
        address: shipping?.address1 || '',
        images
      };
    });
  }

  finishSession(sessionId, { notes } = {}) {
    const session = this.db.prepare('SELECT * FROM pack_sessions WHERE id = ?').get(sessionId);
    if (!session) throw new Error('Session not found');

    const started = new Date(session.started_at + 'Z').getTime();
    this.db.prepare(`
      UPDATE pack_sessions
      SET status = 'packed', finished_at = datetime('now'), duration_ms = ?, notes = ?
      WHERE id = ?
    `).run(Date.now() - started, notes || null, sessionId);

    return this.db.prepare('SELECT * FROM pack_sessions WHERE id = ?').get(sessionId);
  }

  abandonSession(sessionId) {
    this.db.prepare(`
      UPDATE pack_sessions SET status = 'abandoned', finished_at = datetime('now')
      WHERE id = ? AND status = 'open'
    `).run(sessionId);
  }

  /** Packing throughput — the number a warehouse manager actually wants. */
  getStats({ days = 7 } = {}) {
    const summary = this.db.prepare(`
      SELECT 
        COUNT(*) AS total_packed,
        ROUND(AVG(duration_ms) / 1000.0, 1) AS avg_seconds,
        COALESCE(SUM(duration_ms) / 60000.0, 0) AS total_minutes
      FROM pack_sessions
      WHERE status = 'packed'
        AND finished_at >= datetime('now', ?)
    `).get(`-${days} days`);

    const daily = this.db.prepare(`
      SELECT date(finished_at) AS day,
             COUNT(*)          AS orders_packed,
             ROUND(AVG(duration_ms) / 1000.0, 1) AS avg_seconds,
             packer
      FROM pack_sessions
      WHERE status = 'packed'
        AND finished_at >= datetime('now', ?)
      GROUP BY day, packer
      ORDER BY day DESC
    `).all(`-${days} days`);

    const problemCount = this.db.prepare(`
      SELECT COUNT(*) AS count FROM pack_scans WHERE result IN ('unexpected', 'overscan')
    `).get()?.count || 0;

    return {
      summary: summary || { total_packed: 0, avg_seconds: 0, total_minutes: 0 },
      daily: daily || [],
      problemCount
    };
  }

  /** Mis-scans, most frequent first. Usually means a mislabelled SKU. */
  getProblemScans({ limit = 50 } = {}) {
    return this.db.prepare(`
      SELECT code, result, COUNT(*) AS n, MAX(scanned_at) AS last_seen
      FROM pack_scans
      WHERE result IN ('unexpected', 'overscan')
      GROUP BY code, result
      ORDER BY n DESC
      LIMIT ?
    `).all(limit);
  }
}

module.exports = PackRepo;
