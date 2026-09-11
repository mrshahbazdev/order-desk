class OrdersRepo {
  constructor(db) {
    this.db = db;
  }

  list({ store_id, fulfillment, financial, search, from_date, to_date, limit = 100, offset = 0, sort = 'placed_at DESC', include_items = false } = {}) {
    const where = [];
    const params = [];

    if (store_id) {
      where.push('o.store_id = ?');
      params.push(store_id);
    }
    if (fulfillment && fulfillment !== 'all') {
      where.push('o.fulfillment = ?');
      params.push(fulfillment);
    }
    if (financial && financial !== 'all') {
      where.push('o.financial = ?');
      params.push(financial);
    }
    if (from_date) {
      where.push('o.placed_at >= ?');
      params.push(from_date);
    }
    if (to_date) {
      where.push('o.placed_at <= ?');
      params.push(to_date);
    }
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where.push('(o.name LIKE ? OR o.email LIKE ? OR o.phone LIKE ? OR o.tags LIKE ? OR o.remote_id LIKE ?)');
      params.push(q, q, q, q, q);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    
    // Count query
    const countRow = this.db.prepare(`
      SELECT COUNT(*) AS total 
      FROM orders o
      ${whereClause}
    `).get(...params);

    // List query
    const safeSort = ['placed_at DESC', 'placed_at ASC', 'total DESC', 'total ASC', 'id DESC'].includes(sort)
      ? sort
      : 'placed_at DESC';

    const rows = this.db.prepare(`
      SELECT o.*, s.label AS store_label, s.platform AS store_platform,
             (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count,
             (SELECT GROUP_CONCAT(title, ', ') FROM (SELECT title FROM order_items WHERE order_id = o.id LIMIT 3)) AS item_summary
      FROM orders o
      JOIN stores s ON s.id = o.store_id
      ${whereClause}
      ORDER BY o.${safeSort}
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    let itemsByOrder = {};
    if (include_items && rows.length > 0) {
      const orderIds = rows.map(r => r.id);
      const placeholders = orderIds.map(() => '?').join(',');
      const allItems = this.db.prepare(`
        SELECT 
          oi.id, oi.order_id, oi.title, oi.variant, oi.qty, oi.price, oi.total,
          COALESCE(
            NULLIF(oi.image_url, ''),
            (SELECT v.image_url FROM variants v WHERE v.sku = oi.sku AND v.image_url IS NOT NULL LIMIT 1),
            (SELECT p.image_url FROM products p WHERE p.title = oi.title AND p.image_url IS NOT NULL LIMIT 1)
          ) AS image_url,
          COALESCE(
            NULLIF(oi.sku, ''),
            (SELECT v.sku FROM variants v WHERE v.title = oi.variant AND v.product_id IN (SELECT p.id FROM products p WHERE p.title = oi.title) AND v.sku != '' LIMIT 1),
            (SELECT v.sku FROM variants v WHERE v.product_id IN (SELECT p.id FROM products p WHERE p.title = oi.title) AND v.sku != '' LIMIT 1),
            (SELECT v.sku FROM variants v WHERE v.barcode = oi.sku AND v.sku != '' LIMIT 1)
          ) AS sku
        FROM order_items oi
        WHERE oi.order_id IN (${placeholders})
        ORDER BY oi.id ASC
      `).all(...orderIds);

      for (const it of allItems) {
        if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
        itemsByOrder[it.order_id].push(it);
      }
    }

    return {
      orders: rows.map(r => ({
        ...this._parseJsonFields(r),
        ...(include_items ? { items: itemsByOrder[r.id] || [] } : {})
      })),
      total: countRow ? countRow.total : 0,
      limit,
      offset
    };
  }

  getById(id) {
    const order = this.db.prepare(`
      SELECT o.*, s.label AS store_label, s.platform AS store_platform
      FROM orders o
      JOIN stores s ON s.id = o.store_id
      WHERE o.id = ?
    `).get(id);

    if (!order) return null;

    const items = this.db.prepare(`
      SELECT 
        oi.id, oi.order_id, oi.title, oi.variant, oi.qty, oi.price, oi.total,
        COALESCE(
          NULLIF(oi.image_url, ''),
          (SELECT v.image_url FROM variants v WHERE v.sku = oi.sku AND v.image_url IS NOT NULL LIMIT 1),
          (SELECT p.image_url FROM products p WHERE p.title = oi.title AND p.image_url IS NOT NULL LIMIT 1)
        ) AS image_url,
        COALESCE(
          NULLIF(oi.sku, ''),
          (SELECT v.sku FROM variants v WHERE v.title = oi.variant AND v.product_id IN (SELECT p.id FROM products p WHERE p.title = oi.title) AND v.sku != '' LIMIT 1),
          (SELECT v.sku FROM variants v WHERE v.product_id IN (SELECT p.id FROM products p WHERE p.title = oi.title) AND v.sku != '' LIMIT 1),
          (SELECT v.sku FROM variants v WHERE v.barcode = oi.sku AND v.sku != '' LIMIT 1)
        ) AS sku
      FROM order_items oi
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
    `).all(id);

    return {
      ...this._parseJsonFields(order),
      items
    };
  }

  getByIds(ids) {
    if (!ids || !ids.length) return [];
    const placeholders = ids.map(() => '?').join(',');
    const orders = this.db.prepare(`
      SELECT o.*, s.label AS store_label, s.platform AS store_platform
      FROM orders o
      JOIN stores s ON s.id = o.store_id
      WHERE o.id IN (${placeholders})
      ORDER BY o.placed_at DESC
    `).all(...ids);

    return orders.map(order => {
      const items = this.db.prepare(`
        SELECT 
          oi.id, oi.order_id, oi.title, oi.variant, oi.qty, oi.price, oi.total,
          COALESCE(
            NULLIF(oi.image_url, ''),
            (SELECT v.image_url FROM variants v WHERE v.sku = oi.sku AND v.image_url IS NOT NULL LIMIT 1),
            (SELECT p.image_url FROM products p WHERE p.title = oi.title AND p.image_url IS NOT NULL LIMIT 1)
          ) AS image_url,
          COALESCE(
            NULLIF(oi.sku, ''),
            (SELECT v.sku FROM variants v WHERE v.title = oi.variant AND v.product_id IN (SELECT p.id FROM products p WHERE p.title = oi.title) AND v.sku != '' LIMIT 1),
            (SELECT v.sku FROM variants v WHERE v.product_id IN (SELECT p.id FROM products p WHERE p.title = oi.title) AND v.sku != '' LIMIT 1),
            (SELECT v.sku FROM variants v WHERE v.barcode = oi.sku AND v.sku != '' LIMIT 1)
          ) AS sku
        FROM order_items oi
        WHERE oi.order_id = ?
        ORDER BY oi.id ASC
      `).all(order.id);
      return {
        ...this._parseJsonFields(order),
        items
      };
    });
  }

  getByRemoteId(store_id, remote_id) {
    return this.db.prepare('SELECT * FROM orders WHERE store_id = ? AND remote_id = ?').get(store_id, remote_id);
  }

  upsertPage(ordersWithItems) {
    const upsertOrderStmt = this.db.prepare(`
      INSERT INTO orders (
        store_id, remote_id, name, number, email, phone, financial, fulfillment,
        currency, subtotal, shipping, tax, discount, total,
        customer_json, ship_json, bill_json, tags, note, placed_at, updated_at, raw
      ) VALUES (
        @store_id, @remote_id, @name, @number, @email, @phone, @financial, @fulfillment,
        @currency, @subtotal, @shipping, @tax, @discount, @total,
        @customer_json, @ship_json, @bill_json, @tags, @note, @placed_at, @updated_at, @raw
      )
      ON CONFLICT(store_id, remote_id) DO UPDATE SET
        name = excluded.name,
        number = excluded.number,
        email = excluded.email,
        phone = excluded.phone,
        financial = excluded.financial,
        fulfillment = excluded.fulfillment,
        currency = excluded.currency,
        subtotal = excluded.subtotal,
        shipping = excluded.shipping,
        tax = excluded.tax,
        discount = excluded.discount,
        total = excluded.total,
        customer_json = excluded.customer_json,
        ship_json = excluded.ship_json,
        bill_json = excluded.bill_json,
        tags = excluded.tags,
        note = excluded.note,
        placed_at = excluded.placed_at,
        updated_at = excluded.updated_at,
        raw = excluded.raw
    `);

    const deleteItemsStmt = this.db.prepare('DELETE FROM order_items WHERE order_id = ?');
    const insertItemStmt = this.db.prepare(`
      INSERT INTO order_items (order_id, remote_id, sku, title, variant, qty, price, total, tax, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tx = this.db.transaction((itemsList) => {
      let savedCount = 0;
      for (const { order, items } of itemsList) {
        upsertOrderStmt.run(order);
        const existing = this.getByRemoteId(order.store_id, order.remote_id);
        if (existing) {
          deleteItemsStmt.run(existing.id);
          if (items && items.length) {
            for (const item of items) {
              insertItemStmt.run(
                existing.id,
                item.remote_id || null,
                item.sku || '',
                item.title || '',
                item.variant || '',
                item.qty || 1,
                item.price || 0,
                item.total || 0,
                item.tax || 0,
                item.image_url || null
              );
            }
          }
          savedCount++;
        }
      }
      return savedCount;
    });

    return tx(ordersWithItems);
  }

  updateLocalStatus(id, { fulfillment, financial, note, tags }) {
    const updates = [];
    const params = [];
    if (fulfillment !== undefined) { updates.push('fulfillment = ?'); params.push(fulfillment); }
    if (financial !== undefined) { updates.push('financial = ?'); params.push(financial); }
    if (note !== undefined) { updates.push('note = ?'); params.push(note); }
    if (tags !== undefined) { updates.push('tags = ?'); params.push(tags); }

    if (!updates.length) return this.getById(id);
    params.push(new Date().toISOString(), id);
    this.db.prepare(`UPDATE orders SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`).run(...params);
    return this.getById(id);
  }

  getDashboardMetrics(store_id = null) {
    const storeFilter = store_id ? 'WHERE store_id = ?' : '';
    const params = store_id ? [store_id] : [];

    const totalOrders = this.db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue FROM orders ${storeFilter}`).get(...params);
    const unfulfilled = this.db.prepare(`SELECT COUNT(*) as count FROM orders ${storeFilter ? storeFilter + ' AND' : 'WHERE'} fulfillment IN ('unfulfilled', 'partial')`).get(...params);
    const paid = this.db.prepare(`SELECT COUNT(*) as count FROM orders ${storeFilter ? storeFilter + ' AND' : 'WHERE'} financial = 'paid'`).get(...params);
    
    // Today's orders
    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = this.db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue 
      FROM orders 
      ${storeFilter ? storeFilter + ' AND' : 'WHERE'} placed_at >= ?
    `).get(...params, todayStr);

    return {
      totalOrders: totalOrders.count,
      totalRevenue: totalOrders.revenue, // in minor units
      unfulfilledCount: unfulfilled.count,
      paidCount: paid.count,
      todayCount: todayOrders.count,
      todayRevenue: todayOrders.revenue
    };
  }

  _parseJsonFields(order) {
    if (!order) return null;
    return {
      ...order,
      customer: order.customer_json ? this._safeJson(order.customer_json) : null,
      shipping_address: order.ship_json ? this._safeJson(order.ship_json) : null,
      billing_address: order.bill_json ? this._safeJson(order.bill_json) : null
    };
  }

  _safeJson(str) {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }
}

module.exports = OrdersRepo;
