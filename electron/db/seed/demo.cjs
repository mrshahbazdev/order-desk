/**
 * Complete Extended Demo Data Seeder for Skulane
 * Populates realistic multi-store data across all 13+ modules.
 */

function isDemoLoaded(dbManager) {
  const store = dbManager.db.prepare("SELECT id FROM stores WHERE id LIKE 'demo_%' LIMIT 1").get();
  return Boolean(store);
}

function loadDemoData(dbManager) {
  const db = dbManager.db;

  const transaction = db.transaction(() => {
    // 1. Clear existing demo data first to ensure clean state
    clearDemoDataInternal(db);

    // 2. Insert Demo Stores
    const insertStore = db.prepare(`
      INSERT INTO stores (id, name, platform, domain, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'connected', datetime('now'), datetime('now'))
    `);
    insertStore.run('demo_shopify', 'Demo Fashion Store', 'shopify', 'demo-fashion.myshopify.com');
    insertStore.run('demo_woo', 'Demo Footwear Direct', 'woocommerce', 'demo-shoes.pk');

    // 3. Insert Demo Products & Variants
    const insertProduct = db.prepare(`
      INSERT INTO products (
        id, store_id, title, vendor, product_type, status,
        inventory_total, variants_count, images_json, options_json, variants_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    const demoProducts = [
      {
        id: 'prod_demo_1',
        store_id: 'demo_shopify',
        title: 'Classic Oxford Leather Shoes',
        vendor: 'UrbanCraft',
        product_type: 'Footwear',
        inventory: 145,
        variants: [
          { id: 'var_demo_101', title: 'Black / 42', sku: 'OXF-BLK-42', barcode: '8964001001012', price: '6499.00', inventory_quantity: 45 },
          { id: 'var_demo_102', title: 'Black / 43', sku: 'OXF-BLK-43', barcode: '8964001001029', price: '6499.00', inventory_quantity: 50 },
          { id: 'var_demo_103', title: 'Brown / 42', sku: 'OXF-BRN-42', barcode: '8964001001036', price: '6499.00', inventory_quantity: 50 }
        ]
      },
      {
        id: 'prod_demo_2',
        store_id: 'demo_shopify',
        title: 'AirPulse Lightweight Running Sneakers',
        vendor: 'StridePro',
        product_type: 'Athletic',
        inventory: 220,
        variants: [
          { id: 'var_demo_201', title: 'White / 41', sku: 'RUN-WHT-41', barcode: '8964002002018', price: '4899.00', inventory_quantity: 70 },
          { id: 'var_demo_202', title: 'White / 42', sku: 'RUN-WHT-42', barcode: '8964002002025', price: '4899.00', inventory_quantity: 80 },
          { id: 'var_demo_203', title: 'Black / 42', sku: 'RUN-BLK-42', barcode: '8964002002032', price: '4899.00', inventory_quantity: 70 }
        ]
      },
      {
        id: 'prod_demo_3',
        store_id: 'demo_shopify',
        title: 'Premium Heavyweight Cotton Hoodie',
        vendor: 'AuraStyle',
        product_type: 'Apparel',
        inventory: 180,
        variants: [
          { id: 'var_demo_301', title: 'Black / M', sku: 'HD-BLK-M', barcode: '8964003003014', price: '3299.00', inventory_quantity: 60 },
          { id: 'var_demo_302', title: 'Black / L', sku: 'HD-BLK-L', barcode: '8964003003021', price: '3299.00', inventory_quantity: 60 },
          { id: 'var_demo_303', title: 'Navy / L', sku: 'HD-NVY-L', barcode: '8964003003038', price: '3299.00', inventory_quantity: 60 }
        ]
      },
      {
        id: 'prod_demo_4',
        store_id: 'demo_woo',
        title: 'Handmade Italian Suede Loafers',
        vendor: 'MilanoFootwear',
        product_type: 'Luxury Footwear',
        inventory: 85,
        variants: [
          { id: 'var_demo_401', title: 'Tan / 41', sku: 'LOA-TAN-41', barcode: '8964004004010', price: '7999.00', inventory_quantity: 25 },
          { id: 'var_demo_402', title: 'Tan / 42', sku: 'LOA-TAN-42', barcode: '8964004004027', price: '7999.00', inventory_quantity: 30 },
          { id: 'var_demo_403', title: 'Navy / 42', sku: 'LOA-NVY-42', barcode: '8964004004034', price: '7999.00', inventory_quantity: 30 }
        ]
      },
      {
        id: 'prod_demo_5',
        store_id: 'demo_woo',
        title: 'Everyday Minimalist Leather Wallet',
        vendor: 'UrbanCraft',
        product_type: 'Accessories',
        inventory: 310,
        variants: [
          { id: 'var_demo_501', title: 'Vintage Brown', sku: 'WAL-BRN-01', barcode: '8964005005016', price: '1499.00', inventory_quantity: 150 },
          { id: 'var_demo_502', title: 'Matte Black', sku: 'WAL-BLK-01', barcode: '8964005005023', price: '1499.00', inventory_quantity: 160 }
        ]
      }
    ];

    for (const p of demoProducts) {
      insertProduct.run(
        p.id,
        p.store_id,
        p.title,
        p.vendor,
        p.product_type,
        p.inventory,
        p.variants.length,
        JSON.stringify([]),
        JSON.stringify([{ name: 'Option', values: p.variants.map(v => v.title) }]),
        JSON.stringify(p.variants)
      );
    }

    // 4. Warehouse Bin Locations
    const insertLocation = db.prepare(`
      INSERT INTO product_locations (sku, barcode, zone, aisle, rack, shelf, bin, notes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    insertLocation.run('OXF-BLK-42', '8964001001012', 'Zone-A', 'Aisle-01', 'Rack-A', 'Shelf-02', 'Bin-04', 'Fast moving Oxford shoes');
    insertLocation.run('OXF-BLK-43', '8964001001029', 'Zone-A', 'Aisle-01', 'Rack-A', 'Shelf-02', 'Bin-05', 'Oxford shoes size 43');
    insertLocation.run('RUN-WHT-42', '8964002002025', 'Zone-A', 'Aisle-02', 'Rack-B', 'Shelf-01', 'Bin-08', 'AirPulse Runners');
    insertLocation.run('HD-BLK-L', '8964003003021', 'Zone-B', 'Aisle-03', 'Rack-A', 'Shelf-03', 'Bin-12', 'Cotton Hoodies');
    insertLocation.run('LOA-TAN-42', '8964004004027', 'Zone-A', 'Aisle-01', 'Rack-C', 'Shelf-01', 'Bin-02', 'Italian Loafers');
    insertLocation.run('WAL-BRN-01', '8964005005016', 'Zone-C', 'Aisle-01', 'Rack-A', 'Shelf-01', 'Bin-01', 'Wallets security bin');

    // 5. Insert Demo Orders
    const insertOrder = db.prepare(`
      INSERT INTO orders (
        id, store_id, name, order_number, email, phone,
        financial, fulfillment, total, subtotal, tax, shipping,
        currency, placed_at, cancel_reason, ship_json, bill_json,
        items_json, tags, note, risk_level, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), NULL, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const demoOrders = [
      {
        id: 'ord_demo_1001',
        store_id: 'demo_shopify',
        name: '#1001-DEMO',
        order_number: 1001,
        email: 'tariq.javed@example.com',
        phone: '+923001234567',
        financial: 'pending',
        fulfillment: 'unfulfilled',
        total: 6499,
        subtotal: 6249,
        shipping: 250,
        currency: 'PKR',
        offset: '-2 hours',
        city: 'Lahore',
        country: 'Pakistan',
        items: [{ title: 'Classic Oxford Leather Shoes', sku: 'OXF-BLK-42', quantity: 1, price: 6499, barcode: '8964001001012' }],
        tags: 'COD, Urgent',
        risk: 'low'
      },
      {
        id: 'ord_demo_1002',
        store_id: 'demo_shopify',
        name: '#1002-DEMO',
        order_number: 1002,
        email: 'usman.ali@example.com',
        phone: '+923219876543',
        financial: 'pending',
        fulfillment: 'unfulfilled',
        total: 8198,
        subtotal: 7948,
        shipping: 250,
        currency: 'PKR',
        offset: '-4 hours',
        city: 'Karachi',
        country: 'Pakistan',
        items: [
          { title: 'AirPulse Lightweight Running Sneakers', sku: 'RUN-WHT-42', quantity: 1, price: 4899, barcode: '8964002002025' },
          { title: 'Premium Heavyweight Cotton Hoodie', sku: 'HD-BLK-L', quantity: 1, price: 3299, barcode: '8964003003021' }
        ],
        tags: 'COD, VIP',
        risk: 'low'
      },
      {
        id: 'ord_demo_1003',
        store_id: 'demo_shopify',
        name: '#1003-DEMO',
        order_number: 1003,
        email: 'tariq.javed@example.com',
        phone: '+923001234567', // Duplicate phone for detector testing
        financial: 'pending',
        fulfillment: 'unfulfilled',
        total: 3299,
        subtotal: 3049,
        shipping: 250,
        currency: 'PKR',
        offset: '-1 hour',
        city: 'Lahore',
        country: 'Pakistan',
        items: [{ title: 'Premium Heavyweight Cotton Hoodie', sku: 'HD-BLK-L', quantity: 1, price: 3299, barcode: '8964003003021' }],
        tags: 'COD, Potential Duplicate',
        risk: 'medium'
      },
      {
        id: 'ord_demo_1004',
        store_id: 'demo_shopify',
        name: '#1004-DEMO',
        order_number: 1004,
        email: 'sarah.smith@example.co.uk',
        phone: '+447911123456',
        financial: 'paid',
        fulfillment: 'fulfilled',
        total: 120,
        subtotal: 105,
        shipping: 15,
        currency: 'GBP',
        offset: '-1 day',
        city: 'London',
        country: 'United Kingdom',
        items: [{ title: 'Handmade Italian Suede Loafers', sku: 'LOA-TAN-42', quantity: 1, price: 105, barcode: '8964004004027' }],
        tags: 'Prepaid, International',
        risk: 'low'
      },
      {
        id: 'ord_demo_1005',
        store_id: 'demo_woo',
        name: '#5001-DEMO',
        order_number: 5001,
        email: 'bilal.hassan@example.com',
        phone: '+923334445556',
        financial: 'pending',
        fulfillment: 'fulfilled',
        total: 7999,
        subtotal: 7749,
        shipping: 250,
        currency: 'PKR',
        offset: '-2 days',
        city: 'Islamabad',
        country: 'Pakistan',
        items: [{ title: 'Handmade Italian Suede Loafers', sku: 'LOA-TAN-42', quantity: 1, price: 7999, barcode: '8964004004027' }],
        tags: 'COD, Dispatched',
        risk: 'low'
      },
      {
        id: 'ord_demo_1006',
        store_id: 'demo_woo',
        name: '#5002-DEMO',
        order_number: 5002,
        email: 'ahmed.raza@example.com',
        phone: '+923451122334',
        financial: 'pending',
        fulfillment: 'fulfilled',
        total: 1499,
        subtotal: 1299,
        shipping: 200,
        currency: 'PKR',
        offset: '-3 days',
        city: 'Rawalpindi',
        country: 'Pakistan',
        items: [{ title: 'Everyday Minimalist Leather Wallet', sku: 'WAL-BRN-01', quantity: 1, price: 1299, barcode: '8964005005016' }],
        tags: 'COD, Delivered',
        risk: 'low'
      }
    ];

    for (const o of demoOrders) {
      const shipAddr = {
        name: o.email.split('@')[0].replace('.', ' '),
        phone: o.phone,
        address1: 'House 123, Street 4, Sector G-11',
        city: o.city,
        country: o.country
      };

      insertOrder.run(
        o.id,
        o.store_id,
        o.name,
        o.order_number,
        o.email,
        o.phone,
        o.financial,
        o.fulfillment,
        o.total,
        o.subtotal,
        0,
        o.shipping,
        o.currency,
        o.offset,
        JSON.stringify(shipAddr),
        JSON.stringify(shipAddr),
        JSON.stringify(o.items),
        o.tags,
        'Demo order for testing Skulane fulfillment workflows',
        o.risk
      );
    }

    // 6. Demo Shipments & Waybills
    const insertShipment = db.prepare(`
      INSERT INTO shipments (
        order_id, courier_id, tracking_number, status, carrier_name, service_type,
        weight_kg, cod_amount, shipping_fee, destination_city, destination_country,
        customer_name, customer_phone, booked_at, delivered_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), ?)
    `);

    // Fetch courier IDs
    const postex = db.prepare("SELECT id FROM couriers WHERE code = 'POSTEX'").get();
    const trax = db.prepare("SELECT id FROM couriers WHERE code = 'TRAX'").get();
    const dhl = db.prepare("SELECT id FROM couriers WHERE code = 'DHL'").get();

    if (postex) {
      insertShipment.run('ord_demo_1005', postex.id, 'PEX-78891024', 'in_transit', 'PostEx Logistics', 'Standard Express', 1.2, 7999, 250, 'Islamabad', 'Pakistan', 'Bilal Hassan', '+923334445556', '-2 days', null);
    }
    if (trax) {
      insertShipment.run('ord_demo_1006', trax.id, 'TRX-99018421', 'delivered', 'Trax Logistics', 'Overnight Express', 0.4, 1499, 200, 'Rawalpindi', 'Pakistan', 'Ahmed Raza', '+923451122334', '-3 days', "datetime('now', '-1 day')");
    }
    if (dhl) {
      insertShipment.run('ord_demo_1004', dhl.id, 'DHL-44882190', 'delivered', 'DHL Express', 'International Priority', 1.5, 0, 15, 'London', 'United Kingdom', 'Sarah Smith', '+447911123456', '-4 days', "datetime('now', '-2 days')");
    }

    // 7. COD Remittance Reconciliations
    const insertRec = db.prepare(`
      INSERT INTO cod_reconciliations (
        courier_id, statement_ref, total_orders, expected_amount, received_amount,
        courier_charges, difference_amount, status, settlement_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), ?)
    `);
    if (trax) {
      insertRec.run(trax.id, 'STMT-TRX-SEP-01', 12, 45800, 42800, 3000, 0, 'settled', '-2 days', 'Remittance settled cleanly via Bank Transfer.');
    }
    if (postex) {
      insertRec.run(postex.id, 'STMT-PEX-SEP-02', 8, 32000, 29800, 2000, 200, 'disputed', '-1 day', 'Disputed PKR 200 fuel surcharge variation.');
    }

    // 8. Demo Returns & Reverse Logistics
    const insertReturn = db.prepare(`
      INSERT INTO order_returns (
        order_id, order_name, return_tracking, sku, item_name, quantity,
        condition, reason, restocked, notes, processed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
    `);
    insertReturn.run('ord_demo_1006', '#5002-DEMO', 'RET-TRX-1011', 'WAL-BRN-01', 'Everyday Minimalist Leather Wallet', 1, 'resellable', 'Customer Changed Mind', 1, 'Package unopened, restocked in Bin-01.', '-1 day');
    insertReturn.run('ord_demo_1005', '#5001-DEMO', 'RET-PEX-2022', 'LOA-TAN-42', 'Handmade Italian Suede Loafers', 1, 'damaged', 'Defective / Damaged Item', 0, 'Stitch issue on left shoe, sent for repair.', '-3 hours');

    // 9. Wave Picking
    const insertWave = db.prepare(`
      INSERT INTO pick_waves (wave_number, name, status, total_orders, total_items, created_at, completed_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', ?), ?)
    `);
    const waveInfo = insertWave.run('WAVE-2026-001', 'Morning Rush Wave', 'picking', 2, 3, '-3 hours', null);

    const insertWaveOrder = db.prepare(`
      INSERT INTO pick_wave_orders (wave_id, order_id, status)
      VALUES (?, ?, ?)
    `);
    insertWaveOrder.run(waveInfo.lastInsertRowid, 'ord_demo_1001', 'picked');
    insertWaveOrder.run(waveInfo.lastInsertRowid, 'ord_demo_1002', 'assigned');

    // 10. Inventory Forecasting & Supplier Purchase Orders
    const insertPO = db.prepare(`
      INSERT INTO purchase_orders (po_number, supplier_name, status, expected_date, notes, created_at)
      VALUES (?, ?, ?, datetime('now', '+7 days'), ?, datetime('now', '-2 days'))
    `);
    const poInfo = insertPO.run('PO-2026-001', 'Apex Footwear Manufacturing Ltd.', 'submitted', 'Restocking Oxford 42 and 43 sizes');

    const insertPOItem = db.prepare(`
      INSERT INTO purchase_order_items (po_id, sku, product_name, quantity_ordered, quantity_received, unit_cost)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertPOItem.run(poInfo.lastInsertRowid, 'OXF-BLK-42', 'Classic Oxford Leather Shoes (42)', 50, 0, 3200);
    insertPOItem.run(poInfo.lastInsertRowid, 'OXF-BLK-43', 'Classic Oxford Leather Shoes (43)', 50, 0, 3200);

    // 11. Staff Members & Pack Station Productivity Audit
    const insertStaff = db.prepare(`
      INSERT INTO staff_members (operator_id, name, role, is_active, created_at)
      VALUES (?, ?, ?, 1, datetime('now', '-30 days'))
    `);
    insertStaff.run('OP-01', 'Hamza Khan', 'Lead Packer');
    insertStaff.run('OP-02', 'Zainab Bibi', 'Quality Inspector');
    insertStaff.run('OP-03', 'Ali Raza', 'Warehouse Fulfillment Staff');

    const insertAudit = db.prepare(`
      INSERT INTO pack_audit_logs (order_id, order_name, operator_id, verified_items_count, duration_seconds, packed_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', ?))
    `);
    insertAudit.run('ord_demo_1004', '#1004-DEMO', 'OP-01', 1, 34, '-1 day');
    insertAudit.run('ord_demo_1005', '#5001-DEMO', 'OP-02', 1, 42, '-2 days');
    insertAudit.run('ord_demo_1006', '#5002-DEMO', 'OP-01', 1, 28, '-3 days');
  });

  transaction();
  return { success: true, message: 'Demo operational dataset loaded successfully across all modules.' };
}

function clearDemoDataInternal(db) {
  db.prepare("DELETE FROM pack_audit_logs WHERE order_id LIKE 'ord_demo_%'").run();
  db.prepare("DELETE FROM staff_members WHERE operator_id IN ('OP-01', 'OP-02', 'OP-03')").run();
  db.prepare("DELETE FROM purchase_order_items WHERE po_id IN (SELECT id FROM purchase_orders WHERE po_number LIKE 'PO-2026-%')").run();
  db.prepare("DELETE FROM purchase_orders WHERE po_number LIKE 'PO-2026-%'").run();
  db.prepare("DELETE FROM pick_wave_orders WHERE wave_id IN (SELECT id FROM pick_waves WHERE wave_number LIKE 'WAVE-%')").run();
  db.prepare("DELETE FROM pick_waves WHERE wave_number LIKE 'WAVE-%'").run();
  db.prepare("DELETE FROM order_returns WHERE order_id LIKE 'ord_demo_%'").run();
  db.prepare("DELETE FROM cod_reconciliations WHERE statement_ref LIKE 'STMT-%'").run();
  db.prepare("DELETE FROM shipments WHERE order_id LIKE 'ord_demo_%'").run();
  db.prepare("DELETE FROM product_locations WHERE sku IN ('OXF-BLK-42', 'OXF-BLK-43', 'RUN-WHT-42', 'HD-BLK-L', 'LOA-TAN-42', 'WAL-BRN-01')").run();
  db.prepare("DELETE FROM orders WHERE id LIKE 'ord_demo_%'").run();
  db.prepare("DELETE FROM products WHERE id LIKE 'prod_demo_%'").run();
  db.prepare("DELETE FROM stores WHERE id LIKE 'demo_%'").run();
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
