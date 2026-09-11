function generateEan13Barcode(seedNumber = Date.now()) {
  const numStr = String(Math.abs(seedNumber)).padStart(9, '0').slice(-9);
  const base12 = `200${numStr}`;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(base12[i], 10);
    sum += (i % 2 === 0) ? digit : digit * 3;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return `${base12}${checksum}`;
}

function generateSku(productTitle, variantTitle, suffix) {
  const cleanP = (productTitle || 'PROD').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'PROD';
  const cleanV = (variantTitle && variantTitle !== 'Default' && variantTitle !== 'Default Title')
    ? (variantTitle.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase())
    : 'STD';
  const rand = suffix || Math.floor(1000 + Math.random() * 9000);
  return `${cleanP}-${cleanV}-${rand}`;
}

class ProductsRepo {
  constructor(db) {
    this.db = db;
  }

  list({ store_id, search, stock_filter, limit = 100, offset = 0, sort = 'updated_at DESC' } = {}) {
    const where = [];
    const params = [];

    if (store_id && store_id !== 'all') {
      where.push('p.store_id = ?');
      params.push(store_id);
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where.push('(p.title LIKE ? OR p.vendor LIKE ? OR p.tags LIKE ? OR EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND (v.sku LIKE ? OR v.barcode LIKE ?)))');
      params.push(q, q, q, q, q);
    }

    if (stock_filter === 'out_of_stock') {
      where.push('COALESCE((SELECT SUM(stock) FROM variants WHERE product_id = p.id), 0) = 0');
    } else if (stock_filter === 'low_stock') {
      where.push('COALESCE((SELECT SUM(stock) FROM variants WHERE product_id = p.id), 0) > 0 AND COALESCE((SELECT SUM(stock) FROM variants WHERE product_id = p.id), 0) <= 5');
    } else if (stock_filter === 'in_stock') {
      where.push('COALESCE((SELECT SUM(stock) FROM variants WHERE product_id = p.id), 0) > 5');
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRow = this.db.prepare(`
      SELECT COUNT(*) AS total 
      FROM products p
      ${whereClause}
    `).get(...params);

    const safeSort = ['updated_at DESC', 'updated_at ASC', 'title ASC', 'title DESC', 'id DESC'].includes(sort)
      ? sort
      : 'updated_at DESC';

    const products = this.db.prepare(`
      SELECT p.*, s.label AS store_label, s.platform AS store_platform, s.currency AS store_currency,
             (SELECT COUNT(*) FROM variants WHERE product_id = p.id) AS variant_count,
             COALESCE((SELECT SUM(stock) FROM variants WHERE product_id = p.id), 0) AS total_stock,
             (SELECT MIN(price) FROM variants WHERE product_id = p.id) AS min_price,
             (SELECT MAX(price) FROM variants WHERE product_id = p.id) AS max_price,
             (SELECT sku FROM variants WHERE product_id = p.id AND sku IS NOT NULL AND sku != '' LIMIT 1) AS primary_sku
      FROM products p
      JOIN stores s ON s.id = p.store_id
      ${whereClause}
      ORDER BY p.${safeSort}
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return {
      products: products.map(p => {
        const variants = this.db.prepare('SELECT * FROM variants WHERE product_id = ? ORDER BY id ASC').all(p.id);
        return { ...p, variants };
      }),
      total: countRow ? countRow.total : 0,
      limit,
      offset
    };
  }

  getById(id) {
    const product = this.db.prepare(`
      SELECT p.*, s.label AS store_label, s.platform AS store_platform, s.currency AS store_currency,
             (SELECT sku FROM variants WHERE product_id = p.id AND sku IS NOT NULL AND sku != '' LIMIT 1) AS primary_sku
      FROM products p
      JOIN stores s ON s.id = p.store_id
      WHERE p.id = ?
    `).get(id);

    if (!product) return null;

    const variants = this.db.prepare('SELECT * FROM variants WHERE product_id = ? ORDER BY id ASC').all(id);
    return { ...product, variants };
  }

  getByRemoteId(store_id, remote_id) {
    return this.db.prepare('SELECT * FROM products WHERE store_id = ? AND remote_id = ?').get(store_id, remote_id);
  }

  createProduct({ store_id, title, vendor = '', type = '', status = 'active', tags = '', image_url = null, variants = [] }) {
    let storeId = store_id;
    if (!storeId) {
      const firstStore = this.db.prepare('SELECT id FROM stores LIMIT 1').get();
      if (!firstStore) {
        const info = this.db.prepare(`
          INSERT INTO stores (platform, label, domain, currency, credential_id, status)
          VALUES ('shopify', 'Main Store', 'main-store.myshopify.com', 'PKR', 'vault-main', 'active')
        `).run();
        storeId = info.lastInsertRowid;
      } else {
        storeId = firstStore.id;
      }
    }

    const remoteId = `manual_prod_${Date.now()}`;
    const tx = this.db.transaction(() => {
      const pInfo = this.db.prepare(`
        INSERT INTO products (store_id, remote_id, title, vendor, type, status, tags, image_url, updated_at, raw)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), '{}')
      `).run(storeId, remoteId, title, vendor, type, status, tags, image_url || null);

      const productId = pInfo.lastInsertRowid;
      const insertVarStmt = this.db.prepare(`
        INSERT INTO variants (product_id, remote_id, sku, barcode, title, price, compare_at, cost, stock, weight_g, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const varList = variants.length ? variants : [{ title: 'Default', sku: '', price: 100000, stock: 10, image_url: null }];
      for (let i = 0; i < varList.length; i++) {
        const v = varList[i];
        const vRemoteId = `manual_var_${Date.now()}_${i + 1}`;
        const finalSku = v.sku && v.sku.trim() ? v.sku.trim() : generateSku(title, v.title, productId * 100 + i + 1);
        const finalBarcode = v.barcode && v.barcode.trim() ? v.barcode.trim() : generateEan13Barcode(100000000 + productId * 50 + i + 1);

        insertVarStmt.run(
          productId,
          vRemoteId,
          finalSku,
          finalBarcode,
          v.title || 'Default Title',
          Number(v.price) || 0,
          Number(v.compare_at) || 0,
          Number(v.cost) || 0,
          Number(v.stock) || 0,
          Number(v.weight_g) || 0,
          v.image_url || null
        );
      }

      return productId;
    });

    const newId = tx();
    return this.getById(newId);
  }

  addVariantToProduct(productId, { title, sku, barcode, price = 0, compare_at = 0, cost = 0, stock = 0, weight_g = 0, image_url = null }) {
    const prod = this.db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!prod) throw new Error('Product not found');

    const vRemoteId = `manual_var_${Date.now()}_${Math.floor(Math.random()*1000)}`;
    const finalSku = sku && sku.trim() ? sku.trim() : generateSku(prod.title, title, Date.now().toString().slice(-4));
    const finalBarcode = barcode && barcode.trim() ? barcode.trim() : generateEan13Barcode(100000000 + productId * 73 + Math.floor(Math.random() * 900));

    const info = this.db.prepare(`
      INSERT INTO variants (product_id, remote_id, sku, barcode, title, price, compare_at, cost, stock, weight_g, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      productId,
      vRemoteId,
      finalSku,
      finalBarcode,
      title || 'Default Option',
      Number(price) || 0,
      Number(compare_at) || 0,
      Number(cost) || 0,
      Number(stock) || 0,
      Number(weight_g) || 0,
      image_url || null
    );

    this.db.prepare("UPDATE products SET updated_at = datetime('now') WHERE id = ?").run(productId);
    return this.db.prepare('SELECT * FROM variants WHERE id = ?').get(info.lastInsertRowid);
  }

  deleteProduct(id) {
    this.db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return { success: true };
  }

  upsertPage(productsWithVariants) {
    const upsertProdStmt = this.db.prepare(`
      INSERT INTO products (
        store_id, remote_id, title, vendor, type, status, tags, image_url, updated_at, raw
      ) VALUES (
        @store_id, @remote_id, @title, @vendor, @type, @status, @tags, @image_url, @updated_at, @raw
      )
      ON CONFLICT(store_id, remote_id) DO UPDATE SET
        title = excluded.title,
        vendor = excluded.vendor,
        type = excluded.type,
        status = excluded.status,
        tags = excluded.tags,
        image_url = excluded.image_url,
        updated_at = excluded.updated_at,
        raw = excluded.raw
    `);

    const deleteVariantsStmt = this.db.prepare('DELETE FROM variants WHERE product_id = ?');
    const insertVariantStmt = this.db.prepare(`
      INSERT INTO variants (product_id, remote_id, sku, barcode, title, price, compare_at, cost, stock, weight_g, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tx = this.db.transaction((itemsList) => {
      let count = 0;
      for (const { product, variants } of itemsList) {
        upsertProdStmt.run(product);
        const existing = this.getByRemoteId(product.store_id, product.remote_id);
        if (existing) {
          // Preserve local SKUs, barcodes, and images if incoming remote data is blank
          const existingVars = this.db.prepare('SELECT remote_id, sku, barcode, image_url FROM variants WHERE product_id = ?').all(existing.id);
          const existingVarMap = new Map();
          for (const ev of existingVars) {
            if (ev.remote_id) existingVarMap.set(ev.remote_id, ev);
          }

          deleteVariantsStmt.run(existing.id);
          const varList = (variants && variants.length) ? variants : [{ title: 'Default Title', sku: '', barcode: '', price: 0, stock: 0, image_url: product.image_url }];
          for (let idx = 0; idx < varList.length; idx++) {
            const v = varList[idx];
            const prev = v.remote_id ? existingVarMap.get(v.remote_id) : null;
            let mergedSku = (v.sku && String(v.sku).trim()) ? String(v.sku).trim() : (prev?.sku || '');
            let mergedBarcode = (v.barcode && String(v.barcode).trim()) ? String(v.barcode).trim() : (prev?.barcode || '');
            const mergedImage = (v.image_url && String(v.image_url).trim()) ? String(v.image_url).trim() : (prev?.image_url || null);

            // Auto-generate SKU if still empty
            if (!mergedSku || !mergedSku.trim()) {
              mergedSku = generateSku(product.title, v.title, (existing.id * 100) + idx + 1);
            }

            // Auto-generate Barcode (EAN-13) if still empty
            if (!mergedBarcode || !mergedBarcode.trim()) {
              mergedBarcode = generateEan13Barcode(100000000 + (existing.id * 50) + idx + 1);
            }

            insertVariantStmt.run(
              existing.id,
              v.remote_id || null,
              mergedSku,
              mergedBarcode,
              v.title || 'Default Title',
              v.price || 0,
              v.compare_at || 0,
              v.cost || 0,
              v.stock || 0,
              v.weight_g || 0,
              mergedImage
            );
          }
          count++;
        }
      }
      return count;
    });

    return tx(productsWithVariants);
  }

  updateVariantDetails(variantId, { sku, barcode, title, price, cost, stock, compare_at, weight_g, image_url }) {
    const v = this.db.prepare('SELECT v.*, p.store_id, p.title AS product_title FROM variants v JOIN products p ON p.id = v.product_id WHERE v.id = ?').get(variantId);
    if (!v) throw new Error('Variant not found');

    const cleanSku = (sku !== undefined && sku !== null) ? String(sku).trim() : v.sku;
    const cleanBarcode = (barcode !== undefined && barcode !== null) ? String(barcode).trim() : v.barcode;
    const cleanTitle = (title !== undefined && title !== null) ? String(title).trim() : v.title;
    const cleanPrice = price !== undefined ? Number(price) : v.price;
    const cleanCost = cost !== undefined ? Number(cost) : v.cost;
    const cleanCompareAt = compare_at !== undefined ? Number(compare_at) : v.compare_at;
    const cleanStock = stock !== undefined ? Math.max(0, parseInt(stock, 10) || 0) : v.stock;
    const cleanWeight = weight_g !== undefined ? Number(weight_g) : v.weight_g;
    const cleanImage = image_url !== undefined ? image_url : v.image_url;

    this.db.prepare(`
      UPDATE variants
      SET sku = ?, barcode = ?, title = ?, price = ?, compare_at = ?, cost = ?, stock = ?, weight_g = ?, image_url = ?
      WHERE id = ?
    `).run(cleanSku, cleanBarcode, cleanTitle, cleanPrice, cleanCompareAt, cleanCost, cleanStock, cleanWeight, cleanImage, variantId);

    this.db.prepare("UPDATE products SET updated_at = datetime('now') WHERE id = ?").run(v.product_id);

    return this.db.prepare('SELECT * FROM variants WHERE id = ?').get(variantId);
  }

  autoGenerateMissingSkusAndBarcodes({ store_id, product_id } = {}) {
    const where = [];
    const params = [];
    if (store_id && store_id !== 'all') {
      where.push('p.store_id = ?');
      params.push(store_id);
    }
    if (product_id) {
      where.push('p.id = ?');
      params.push(product_id);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const variantsToFix = this.db.prepare(`
      SELECT v.*, p.title AS product_title, p.store_id
      FROM variants v
      JOIN products p ON p.id = v.product_id
      ${whereClause}
      ORDER BY v.id ASC
    `).all(...params);

    const updateStmt = this.db.prepare(`
      UPDATE variants SET sku = ?, barcode = ? WHERE id = ?
    `);

    let updatedCount = 0;
    const tx = this.db.transaction(() => {
      for (const v of variantsToFix) {
        let changed = false;
        let newSku = v.sku;
        let newBarcode = v.barcode;

        if (!newSku || !newSku.trim()) {
          newSku = generateSku(v.product_title, v.title, v.id);
          changed = true;
        }

        if (!newBarcode || !newBarcode.trim()) {
          newBarcode = generateEan13Barcode(100000000 + v.id * 37 + (v.product_id || 1));
          changed = true;
        }

        if (changed) {
          updateStmt.run(newSku, newBarcode, v.id);
          updatedCount++;
        }
      }
    });

    tx();
    return { success: true, updatedCount };
  }

  updateVariantStock(variantId, newStock) {
    const v = this.db.prepare('SELECT v.*, p.store_id, p.remote_id AS prod_remote_id FROM variants v JOIN products p ON p.id = v.product_id WHERE v.id = ?').get(variantId);
    if (!v) throw new Error('Variant not found');

    const stockNum = Math.max(0, parseInt(newStock, 10) || 0);
    this.db.prepare('UPDATE variants SET stock = ? WHERE id = ?').run(stockNum, variantId);
    this.db.prepare("UPDATE products SET updated_at = datetime('now') WHERE id = ?").run(v.product_id);

    // Queue outbox inventory update job
    if (this.db.outbox) {
      this.db.outbox.enqueue(
        v.store_id,
        'update_inventory',
        JSON.stringify({
          variant_id: v.id,
          remote_variant_id: v.remote_id,
          sku: v.sku,
          new_stock: stockNum
        })
      );
    }

    return this.db.prepare('SELECT * FROM variants WHERE id = ?').get(variantId);
  }

  seedDemoCatalog(storeId = null) {
    let targetStoreId = storeId;
    if (!targetStoreId) {
      const firstStore = this.db.prepare('SELECT id FROM stores LIMIT 1').get();
      if (!firstStore) {
        const info = this.db.prepare(`
          INSERT INTO stores (platform, label, domain, currency, credential_id, status)
          VALUES ('shopify', 'Shopify Flagship Store', 'shop-demo.myshopify.com', 'PKR', 'vault-demo', 'active')
        `).run();
        targetStoreId = info.lastInsertRowid;
      } else {
        targetStoreId = firstStore.id;
      }
    }

    const demoProducts = [
      {
        title: 'Premium Cotton Polo Shirt (Breathable Pique)',
        vendor: 'UrbanFit',
        type: 'Apparel',
        tags: 'Summer, Polo, Best Seller',
        image_url: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=200',
        variants: [
          { title: 'Small / Navy Blue', sku: 'POLO-NVY-S', barcode: '8901001001', price: 289900, stock: 25 },
          { title: 'Medium / Navy Blue', sku: 'POLO-NVY-M', barcode: '8901001002', price: 289900, stock: 40 },
          { title: 'Large / Navy Blue', sku: 'POLO-NVY-L', barcode: '8901001003', price: 289900, stock: 15 },
          { title: 'XL / Navy Blue', sku: 'POLO-NVY-XL', barcode: '8901001004', price: 289900, stock: 3 }
        ]
      },
      {
        title: 'Wireless Active Noise-Cancelling Headphones Pro',
        vendor: 'AcousticLab',
        type: 'Electronics',
        tags: 'Audio, Bluetooth, ANC',
        image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200',
        variants: [
          { title: 'Matte Black', sku: 'ANC-HP-BLK', barcode: '8902002001', price: 1450000, stock: 18 },
          { title: 'Silver Platinum', sku: 'ANC-HP-SLV', barcode: '8902002002', price: 1450000, stock: 8 }
        ]
      },
      {
        title: 'Ultralight Waterproof Commuter Backpack (25L)',
        vendor: 'NordicPack',
        type: 'Accessories',
        tags: 'Travel, Laptop Bag, Waterproof',
        image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200',
        variants: [
          { title: 'Charcoal Grey', sku: 'BPK-25L-GRY', barcode: '8903003001', price: 620000, stock: 12 },
          { title: 'Olive Green', sku: 'BPK-25L-OLV', barcode: '8903003002', price: 620000, stock: 0 }
        ]
      },
      {
        title: 'High-Speed Magnetic 3-in-1 Wireless Charging Dock',
        vendor: 'ChargeTech',
        type: 'Accessories',
        tags: 'MagSafe, Fast Charge, Desk',
        image_url: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=200',
        variants: [
          { title: 'Space Black', sku: 'CHG-3IN1-BLK', barcode: '8904004001', price: 499900, stock: 32 }
        ]
      }
    ];

    let created = 0;
    for (const p of demoProducts) {
      this.createProduct({ store_id: targetStoreId, ...p });
      created++;
    }

    return { success: true, count: created };
  }
}

module.exports = ProductsRepo;
