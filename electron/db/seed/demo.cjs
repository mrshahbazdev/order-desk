/**
 * Complete Extended Demo Data Seeder for Skulane
 * Populates realistic multi-store data across all 13+ modules.
 */

function isDemoLoaded(dbManager) {
  const store = dbManager.db.prepare("SELECT id FROM stores WHERE domain IN ('demo-fashion.myshopify.com', 'demo-shoes.pk') LIMIT 1").get();
  return Boolean(store);
}

function clearDemoDataInternal(db) {
  // 1. Pack audit logs
  db.prepare("DELETE FROM pack_audit_logs WHERE staff_name IN ('Hamza Khan', 'Zainab Bibi', 'Ali Raza')").run();

  // 2. Staff members
  db.prepare("DELETE FROM staff_members WHERE employee_code IN ('OP-01', 'OP-02', 'OP-03')").run();

  // 3. Purchase orders & items
  db.prepare("DELETE FROM purchase_order_items WHERE po_id IN (SELECT id FROM purchase_orders WHERE po_number LIKE 'PO-2026-%')").run();
  db.prepare("DELETE FROM purchase_orders WHERE po_number LIKE 'PO-2026-%'").run();

  // 4. Wave picking
  db.prepare("DELETE FROM pick_wave_orders WHERE wave_id IN (SELECT id FROM pick_waves WHERE wave_number LIKE 'WAVE-%')").run();
  db.prepare("DELETE FROM pick_waves WHERE wave_number LIKE 'WAVE-%'").run();

  // 5. Returns
  db.prepare("DELETE FROM order_returns WHERE order_number LIKE '%-DEMO'").run();

  // 6. COD reconciliations
  db.prepare("DELETE FROM cod_reconciliations WHERE statement_ref LIKE 'STMT-%'").run();

  // 7. Shipments
  db.prepare("DELETE FROM shipments WHERE tracking_number IN ('PEX-78891024', 'TRX-99018421', 'DHL-44882190')").run();

  // 8. Product locations
  db.prepare("DELETE FROM product_locations WHERE variant_id IN (SELECT id FROM variants WHERE remote_id LIKE 'var_demo_%')").run();

  // 9. Order items & orders
  db.prepare("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE remote_id LIKE 'demo_%')").run();
  db.prepare("DELETE FROM orders WHERE remote_id LIKE 'demo_%'").run();

  // 10. Variants & products
  db.prepare("DELETE FROM variants WHERE remote_id LIKE 'var_demo_%'").run();
  db.prepare("DELETE FROM products WHERE remote_id LIKE 'prod_demo_%'").run();

  // 11. Stores
  db.prepare("DELETE FROM stores WHERE domain IN ('demo-fashion.myshopify.com', 'demo-shoes.pk')").run();
}

function loadDemoData(dbManager) {
  const db = dbManager.db;

  const transaction = db.transaction(() => {
    // 1. Clear existing demo data first to ensure clean state
    clearDemoDataInternal(db);

    // 2. Insert Demo Stores
    const insertStore = db.prepare(`
      INSERT INTO stores (platform, label, domain, currency, timezone, credential_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', datetime('now'))
    `);
    const store1 = insertStore.run('shopify', 'Demo Fashion Store', 'demo-fashion.myshopify.com', 'PKR', 'Asia/Karachi', 'cred_demo_shopify');
    const store2 = insertStore.run('woo', 'Demo Footwear Direct', 'demo-shoes.pk', 'PKR', 'Asia/Karachi', 'cred_demo_woo');
    const shopifyId = store1.lastInsertRowid;
    const wooId = store2.lastInsertRowid;

    // 3. Insert Demo Products & Variants
    const insertProduct = db.prepare(`
      INSERT INTO products (store_id, remote_id, title, vendor, type, status, tags, image_url, updated_at, raw)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?, datetime('now'), ?)
    `);

    const insertVariant = db.prepare(`
      INSERT INTO variants (product_id, remote_id, sku, barcode, title, price, compare_at, cost, stock, weight_g, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const demoProducts = [
      {
        remote_id: 'prod_demo_1',
        store_id: shopifyId,
        title: 'Classic Oxford Leather Shoes',
        vendor: 'UrbanCraft',
        type: 'Footwear',
        tags: 'Shoes, Leather, Formal',
        image_url: '',
        variants: [
          { remote_id: 'var_demo_101', title: 'Black / 42', sku: 'OXF-BLK-42', barcode: '8964001001012', price: 649900, compare_at: 749900, cost: 320000, stock: 45, weight_g: 850 },
          { remote_id: 'var_demo_102', title: 'Black / 43', sku: 'OXF-BLK-43', barcode: '8964001001029', price: 649900, compare_at: 749900, cost: 320000, stock: 50, weight_g: 880 },
          { remote_id: 'var_demo_103', title: 'Brown / 42', sku: 'OXF-BRN-42', barcode: '8964001001036', price: 649900, compare_at: 749900, cost: 320000, stock: 50, weight_g: 850 }
        ]
      },
      {
        remote_id: 'prod_demo_2',
        store_id: shopifyId,
        title: 'AirPulse Lightweight Running Sneakers',
        vendor: 'StridePro',
        type: 'Athletic',
        tags: 'Sneakers, Running, Casual',
        image_url: '',
        variants: [
          { remote_id: 'var_demo_201', title: 'White / 41', sku: 'RUN-WHT-41', barcode: '8964002002018', price: 489900, compare_at: 549900, cost: 240000, stock: 70, weight_g: 650 },
          { remote_id: 'var_demo_202', title: 'White / 42', sku: 'RUN-WHT-42', barcode: '8964002002025', price: 489900, compare_at: 549900, cost: 240000, stock: 80, weight_g: 670 },
          { remote_id: 'var_demo_203', title: 'Black / 42', sku: 'RUN-BLK-42', barcode: '8964002002032', price: 489900, compare_at: 549900, cost: 240000, stock: 70, weight_g: 670 }
        ]
      },
      {
        remote_id: 'prod_demo_3',
        store_id: shopifyId,
        title: 'Premium Heavyweight Cotton Hoodie',
        vendor: 'AuraStyle',
        type: 'Apparel',
        tags: 'Hoodie, Winter, Cotton',
        image_url: '',
        variants: [
          { remote_id: 'var_demo_301', title: 'Black / M', sku: 'HD-BLK-M', barcode: '8964003003014', price: 329900, compare_at: 399900, cost: 160000, stock: 60, weight_g: 500 },
          { remote_id: 'var_demo_302', title: 'Black / L', sku: 'HD-BLK-L', barcode: '8964003003021', price: 329900, compare_at: 399900, cost: 160000, stock: 60, weight_g: 520 },
          { remote_id: 'var_demo_303', title: 'Navy / L', sku: 'HD-NVY-L', barcode: '8964003003038', price: 329900, compare_at: 399900, cost: 160000, stock: 60, weight_g: 520 }
        ]
      },
      {
        remote_id: 'prod_demo_4',
        store_id: wooId,
        title: 'Handmade Italian Suede Loafers',
        vendor: 'MilanoFootwear',
        type: 'Luxury Footwear',
        tags: 'Loafers, Suede, Premium',
        image_url: '',
        variants: [
          { remote_id: 'var_demo_401', title: 'Tan / 41', sku: 'LOA-TAN-41', barcode: '8964004004010', price: 799900, compare_at: 899900, cost: 420000, stock: 25, weight_g: 800 },
          { remote_id: 'var_demo_402', title: 'Tan / 42', sku: 'LOA-TAN-42', barcode: '8964004004027', price: 799900, compare_at: 899900, cost: 420000, stock: 30, weight_g: 820 },
          { remote_id: 'var_demo_403', title: 'Navy / 42', sku: 'LOA-NVY-42', barcode: '8964004004034', price: 799900, compare_at: 899900, cost: 420000, stock: 30, weight_g: 820 }
        ]
      },
      {
        remote_id: 'prod_demo_5',
        store_id: wooId,
        title: 'Everyday Minimalist Leather Wallet',
        vendor: 'UrbanCraft',
        type: 'Accessories',
        tags: 'Leather, Wallet, Accessories',
        image_url: '',
        variants: [
          { remote_id: 'var_demo_501', title: 'Vintage Brown', sku: 'WAL-BRN-01', barcode: '8964005005016', price: 149900, compare_at: 199900, cost: 70000, stock: 150, weight_g: 120 },
          { remote_id: 'var_demo_502', title: 'Matte Black', sku: 'WAL-BLK-01', barcode: '8964005005023', price: 149900, compare_at: 199900, cost: 70000, stock: 160, weight_g: 120 }
        ]
      }
    ];

    const variantIdBySku = {};
    for (const p of demoProducts) {
      const pInfo = insertProduct.run(
        p.store_id,
        p.remote_id,
        p.title,
        p.vendor,
        p.type,
        p.tags,
        p.image_url,
        JSON.stringify({ title: p.title, vendor: p.vendor })
      );
      const prodDbId = pInfo.lastInsertRowid;

      for (const v of p.variants) {
        const vInfo = insertVariant.run(
          prodDbId,
          v.remote_id,
          v.sku,
          v.barcode,
          v.title,
          v.price,
          v.compare_at,
          v.cost,
          v.stock,
          v.weight_g,
          ''
        );
        variantIdBySku[v.sku] = vInfo.lastInsertRowid;
      }
    }

    // 4. Warehouse Bin Locations
    const insertLocation = db.prepare(`
      INSERT INTO product_locations (variant_id, zone, rack, shelf, bin, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);
    if (variantIdBySku['OXF-BLK-42']) insertLocation.run(variantIdBySku['OXF-BLK-42'], 'A', '01', '2', 'B-04');
    if (variantIdBySku['OXF-BLK-43']) insertLocation.run(variantIdBySku['OXF-BLK-43'], 'A', '01', '2', 'B-05');
    if (variantIdBySku['RUN-WHT-42']) insertLocation.run(variantIdBySku['RUN-WHT-42'], 'A', '02', '1', 'B-08');
    if (variantIdBySku['HD-BLK-L'])   insertLocation.run(variantIdBySku['HD-BLK-L'],   'B', '03', '3', 'B-12');
    if (variantIdBySku['LOA-TAN-42']) insertLocation.run(variantIdBySku['LOA-TAN-42'], 'A', '01', '1', 'B-02');
    if (variantIdBySku['WAL-BRN-01']) insertLocation.run(variantIdBySku['WAL-BRN-01'], 'C', '01', '1', 'B-01');

    // 5. Orders & Order Items
    const insertOrder = db.prepare(`
      INSERT INTO orders (
        store_id, remote_id, name, number, email, phone,
        financial, fulfillment, currency, subtotal, shipping, tax, discount, total,
        customer_json, ship_json, bill_json, tags, note, placed_at, updated_at, raw
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now'), ?)
    `);

    const insertOrderItem = db.prepare(`
      INSERT INTO order_items (
        order_id, remote_id, sku, title, variant, qty, price, total, tax, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `);

    const demoOrders = [
      {
        remote_id: 'demo_1001',
        store_id: shopifyId,
        name: '#1001-DEMO',
        number: 1001,
        email: 'tariq.javed@example.com',
        phone: '+923001234567',
        financial: 'pending',
        fulfillment: 'unfulfilled',
        total: 649900,
        subtotal: 624900,
        shipping: 25000,
        currency: 'PKR',
        offset: '-2 hours',
        city: 'Lahore',
        country: 'Pakistan',
        tags: 'COD, Urgent',
        items: [{ title: 'Classic Oxford Leather Shoes', variant: 'Black / 42', sku: 'OXF-BLK-42', qty: 1, price: 649900 }]
      },
      {
        remote_id: 'demo_1002',
        store_id: shopifyId,
        name: '#1002-DEMO',
        number: 1002,
        email: 'usman.ali@example.com',
        phone: '+923219876543',
        financial: 'pending',
        fulfillment: 'unfulfilled',
        total: 819800,
        subtotal: 794800,
        shipping: 25000,
        currency: 'PKR',
        offset: '-4 hours',
        city: 'Karachi',
        country: 'Pakistan',
        tags: 'COD, VIP',
        items: [
          { title: 'AirPulse Lightweight Running Sneakers', variant: 'White / 42', sku: 'RUN-WHT-42', qty: 1, price: 489900 },
          { title: 'Premium Heavyweight Cotton Hoodie', variant: 'Black / L', sku: 'HD-BLK-L', qty: 1, price: 329900 }
        ]
      },
      {
        remote_id: 'demo_1003',
        store_id: shopifyId,
        name: '#1003-DEMO',
        number: 1003,
        email: 'tariq.javed@example.com',
        phone: '+923001234567',
        financial: 'pending',
        fulfillment: 'unfulfilled',
        total: 329900,
        subtotal: 304900,
        shipping: 25000,
        currency: 'PKR',
        offset: '-1 hour',
        city: 'Lahore',
        country: 'Pakistan',
        tags: 'COD, Potential Duplicate',
        items: [{ title: 'Premium Heavyweight Cotton Hoodie', variant: 'Black / L', sku: 'HD-BLK-L', qty: 1, price: 329900 }]
      },
      {
        remote_id: 'demo_1004',
        store_id: shopifyId,
        name: '#1004-DEMO',
        number: 1004,
        email: 'sarah.smith@example.co.uk',
        phone: '+447911123456',
        financial: 'paid',
        fulfillment: 'fulfilled',
        total: 12000,
        subtotal: 10500,
        shipping: 1500,
        currency: 'GBP',
        offset: '-1 day',
        city: 'London',
        country: 'United Kingdom',
        tags: 'Prepaid, International',
        items: [{ title: 'Handmade Italian Suede Loafers', variant: 'Tan / 42', sku: 'LOA-TAN-42', qty: 1, price: 10500 }]
      },
      {
        remote_id: 'demo_5001',
        store_id: wooId,
        name: '#5001-DEMO',
        number: 5001,
        email: 'bilal.hassan@example.com',
        phone: '+923334445556',
        financial: 'pending',
        fulfillment: 'fulfilled',
        total: 799900,
        subtotal: 774900,
        shipping: 25000,
        currency: 'PKR',
        offset: '-2 days',
        city: 'Islamabad',
        country: 'Pakistan',
        tags: 'COD, Dispatched',
        items: [{ title: 'Handmade Italian Suede Loafers', variant: 'Tan / 42', sku: 'LOA-TAN-42', qty: 1, price: 799900 }]
      },
      {
        remote_id: 'demo_5002',
        store_id: wooId,
        name: '#5002-DEMO',
        number: 5002,
        email: 'ahmed.raza@example.com',
        phone: '+923451122334',
        financial: 'pending',
        fulfillment: 'fulfilled',
        total: 149900,
        subtotal: 129900,
        shipping: 20000,
        currency: 'PKR',
        offset: '-3 days',
        city: 'Rawalpindi',
        country: 'Pakistan',
        tags: 'COD, Delivered',
        items: [{ title: 'Everyday Minimalist Leather Wallet', variant: 'Vintage Brown', sku: 'WAL-BRN-01', qty: 1, price: 129900 }]
      }
    ];

    const orderIdByNumber = {};
    for (const o of demoOrders) {
      const shipAddr = {
        name: o.email.split('@')[0].replace('.', ' '),
        phone: o.phone,
        address1: 'House 123, Street 4, Sector G-11',
        city: o.city,
        country: o.country
      };

      const oInfo = insertOrder.run(
        o.store_id,
        o.remote_id,
        o.name,
        o.number,
        o.email,
        o.phone,
        o.financial,
        o.fulfillment,
        o.currency,
        o.subtotal,
        o.shipping,
        o.total,
        JSON.stringify(shipAddr),
        JSON.stringify(shipAddr),
        JSON.stringify(shipAddr),
        o.tags,
        'Demo order for testing Skulane fulfillment workflows',
        o.offset,
        JSON.stringify({ raw_demo: true })
      );
      const oDbId = oInfo.lastInsertRowid;
      orderIdByNumber[o.number] = oDbId;

      for (let idx = 0; idx < o.items.length; idx++) {
        const item = o.items[idx];
        insertOrderItem.run(
          oDbId,
          `${o.remote_id}_item_${idx + 1}`,
          item.sku,
          item.title,
          item.variant,
          item.qty,
          item.price,
          item.price * item.qty,
          ''
        );
      }
    }

    // 6. Demo Shipments & Waybills
    const insertShipment = db.prepare(`
      INSERT INTO shipments (
        order_id, courier_id, tracking_number, status, carrier_name, service_type,
        weight_kg, cod_amount, shipping_fee, destination_city, destination_country,
        customer_name, customer_phone, booked_at, delivered_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), ?)
    `);

    const postex = db.prepare("SELECT id FROM couriers WHERE code = 'POSTEX'").get();
    const trax = db.prepare("SELECT id FROM couriers WHERE code = 'TRAX'").get();
    const dhl = db.prepare("SELECT id FROM couriers WHERE code = 'DHL'").get();

    if (postex && orderIdByNumber[5001]) {
      insertShipment.run(orderIdByNumber[5001], postex.id, 'PEX-78891024', 'in_transit', 'PostEx Logistics', 'Standard Express', 1.2, 799900, 25000, 'Islamabad', 'Pakistan', 'Bilal Hassan', '+923334445556', '-2 days', null);
    }
    if (trax && orderIdByNumber[5002]) {
      insertShipment.run(orderIdByNumber[5002], trax.id, 'TRX-99018421', 'delivered', 'Trax Logistics', 'Overnight Express', 0.4, 149900, 20000, 'Rawalpindi', 'Pakistan', 'Ahmed Raza', '+923451122334', '-3 days', "datetime('now', '-1 day')");
    }
    if (dhl && orderIdByNumber[1004]) {
      insertShipment.run(orderIdByNumber[1004], dhl.id, 'DHL-44882190', 'delivered', 'DHL Express', 'International Priority', 1.5, 0, 1500, 'London', 'United Kingdom', 'Sarah Smith', '+447911123456', '-4 days', "datetime('now', '-2 days')");
    }

    // 7. COD Remittance Reconciliations
    const insertRec = db.prepare(`
      INSERT INTO cod_reconciliations (
        courier_id, statement_ref, total_orders, expected_amount, received_amount,
        courier_charges, difference_amount, status, settlement_date, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), ?, datetime('now'))
    `);
    if (trax) {
      insertRec.run(trax.id, 'STMT-TRX-SEP-01', 12, 4580000, 4280000, 300000, 0, 'settled', '-2 days', 'Remittance settled cleanly via Bank Transfer.');
    }
    if (postex) {
      insertRec.run(postex.id, 'STMT-PEX-SEP-02', 8, 3200000, 2980000, 200000, 20000, 'disputed', '-1 day', 'Disputed PKR 200 fuel surcharge variation.');
    }

    // 8. Demo Returns & Reverse Logistics
    const insertReturn = db.prepare(`
      INSERT INTO order_returns (
        order_id, order_number, tracking_number, variant_id, item_title, variant_title, sku,
        qty, reason, condition_status, restocked, customer_name, customer_phone, received_by, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
    `);
    if (orderIdByNumber[5002]) {
      insertReturn.run(
        orderIdByNumber[5002], '#5002-DEMO', 'RET-TRX-1011', variantIdBySku['WAL-BRN-01'] || null,
        'Everyday Minimalist Leather Wallet', 'Vintage Brown', 'WAL-BRN-01',
        1, 'size_fit', 'resellable', 1, 'Ahmed Raza', '+923451122334', 'Hamza Khan', 'Package unopened, restocked in Bin-01.', '-1 day'
      );
    }
    if (orderIdByNumber[5001]) {
      insertReturn.run(
        orderIdByNumber[5001], '#5001-DEMO', 'RET-PEX-2022', variantIdBySku['LOA-TAN-42'] || null,
        'Handmade Italian Suede Loafers', 'Tan / 42', 'LOA-TAN-42',
        1, 'defective', 'damaged', 0, 'Bilal Hassan', '+923334445556', 'Hamza Khan', 'Stitch issue on left shoe, sent for repair.', '-3 hours'
      );
    }

    // 9. Wave Picking
    const insertWave = db.prepare(`
      INSERT INTO pick_waves (wave_number, total_orders, total_items, status, created_by, created_at, completed_at)
      VALUES (?, ?, ?, 'in_progress', ?, datetime('now', ?), NULL)
    `);
    const waveInfo = insertWave.run('WAVE-2026-001', 2, 3, 'Shift Supervisor', '-3 hours');
    const waveId = waveInfo.lastInsertRowid;

    const insertWaveOrder = db.prepare(`
      INSERT INTO pick_wave_orders (wave_id, order_id)
      VALUES (?, ?)
    `);
    if (orderIdByNumber[1001]) insertWaveOrder.run(waveId, orderIdByNumber[1001]);
    if (orderIdByNumber[1002]) insertWaveOrder.run(waveId, orderIdByNumber[1002]);

    // 10. Inventory Forecasting & Supplier Purchase Orders
    const insertPO = db.prepare(`
      INSERT INTO purchase_orders (po_number, supplier_name, supplier_email, supplier_phone, status, total_amount, expected_delivery, notes, created_at)
      VALUES (?, ?, ?, ?, 'ordered', ?, datetime('now', '+7 days'), ?, datetime('now', '-2 days'))
    `);
    const poInfo = insertPO.run('PO-2026-001', 'Apex Footwear Manufacturing Ltd.', 'orders@apexfootwear.pk', '+924235551234', 32000000, 'Restocking Oxford 42 and 43 sizes');
    const poId = poInfo.lastInsertRowid;

    const insertPOItem = db.prepare(`
      INSERT INTO purchase_order_items (po_id, variant_id, item_title, sku, qty_ordered, qty_received, unit_cost)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertPOItem.run(poId, variantIdBySku['OXF-BLK-42'] || null, 'Classic Oxford Leather Shoes (42)', 'OXF-BLK-42', 50, 0, 320000);
    insertPOItem.run(poId, variantIdBySku['OXF-BLK-43'] || null, 'Classic Oxford Leather Shoes (43)', 'OXF-BLK-43', 50, 0, 320000);

    // 11. Staff Members & Pack Station Productivity Audit
    const insertStaff = db.prepare(`
      INSERT INTO staff_members (name, role, employee_code, pin_code, is_active, created_at)
      VALUES (?, ?, ?, ?, 1, datetime('now', '-30 days'))
    `);
    const s1 = insertStaff.run('Hamza Khan', 'Packer', 'OP-01', '1234');
    const s2 = insertStaff.run('Zainab Bibi', 'Supervisor', 'OP-02', '5678');
    insertStaff.run('Ali Raza', 'Picker', 'OP-03', '9012');

    const insertAudit = db.prepare(`
      INSERT INTO pack_audit_logs (order_id, staff_id, staff_name, duration_seconds, items_packed, package_weight_g, verification_status, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, 'verified', datetime('now', ?))
    `);
    if (orderIdByNumber[1004]) insertAudit.run(orderIdByNumber[1004], s1.lastInsertRowid, 'Hamza Khan', 34, 1, 450, '-1 day');
    if (orderIdByNumber[5001]) insertAudit.run(orderIdByNumber[5001], s2.lastInsertRowid, 'Zainab Bibi', 42, 1, 600, '-2 days');
    if (orderIdByNumber[5002]) insertAudit.run(orderIdByNumber[5002], s1.lastInsertRowid, 'Hamza Khan', 28, 1, 350, '-3 days');
  });

  transaction();
  return { success: true, message: 'Demo operational dataset loaded successfully across all modules.' };
}

function clearDemoData(dbManager) {
  const db = dbManager.db;
  const transaction = db.transaction(() => {
    clearDemoDataInternal(db);
  });
  transaction();
  return { success: true, message: 'Demo data cleared completely.' };
}

module.exports = {
  isDemoLoaded,
  loadDemoData,
  clearDemoData
};
