function toMinorUnits(amountStr) {
  if (!amountStr) return 0;
  const num = parseFloat(amountStr);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

function normalizeWooProduct(storeId, raw) {
  const product = {
    store_id: storeId,
    remote_id: String(raw.id),
    title: raw.name || '',
    vendor: '',
    type: raw.type || 'simple',
    status: raw.status === 'publish' ? 'active' : raw.status,
    tags: Array.isArray(raw.tags) ? raw.tags.map(t => t.name).join(', ') : '',
    image_url: raw.images && raw.images.length ? raw.images[0].src : null,
    updated_at: raw.date_modified_gmt ? raw.date_modified_gmt + 'Z' : (raw.date_modified || new Date().toISOString()),
    raw: JSON.stringify(raw)
  };

  const variants = [];
  if (raw.variations && raw.variations.length > 0) {
    // If variable product, create default or variation placeholders
    variants.push({
      remote_id: String(raw.id),
      sku: raw.sku || '',
      barcode: '',
      title: 'Default',
      price: toMinorUnits(raw.price),
      compare_at: toMinorUnits(raw.regular_price),
      cost: 0,
      stock: raw.stock_quantity || 0,
      weight_g: raw.weight ? Math.round(parseFloat(raw.weight) * 1000) : 0
    });
  } else {
    variants.push({
      remote_id: String(raw.id),
      sku: raw.sku || '',
      barcode: '',
      title: 'Default',
      price: toMinorUnits(raw.price),
      compare_at: toMinorUnits(raw.regular_price),
      cost: 0,
      stock: raw.stock_quantity || 0,
      weight_g: raw.weight ? Math.round(parseFloat(raw.weight) * 1000) : 0
    });
  }

  return { product, variants };
}

async function pullWooProducts({ client, storeId, db, onProgress }) {
  const syncRepo = db.sync;
  const productsRepo = db.products;

  let page = 1;
  const perPage = 50;
  let totalProcessed = 0;
  let totalPages = 1;

  do {
    const response = await client.request('products', {
      params: { per_page: perPage, page }
    });

    const productsList = response.data || [];
    totalPages = response.totalPages || 1;

    if (!productsList.length) break;

    const normalizedList = productsList.map(raw => normalizeWooProduct(storeId, raw));
    const saved = productsRepo.upsertPage(normalizedList);
    totalProcessed += saved;

    if (onProgress) {
      onProgress({
        storeId,
        resource: 'products',
        processed: totalProcessed,
        page,
        totalPages
      });
    }

    page++;
  } while (page <= totalPages);

  syncRepo.setState({
    store_id: storeId,
    resource: 'products',
    cursor: null,
    watermark: new Date().toISOString(),
    backfill_done: 1
  });

  syncRepo.log({
    store_id: storeId,
    resource: 'products',
    type: 'incremental',
    message: `Synced ${totalProcessed} WooCommerce products`,
    details: { totalProcessed }
  });

  return { totalProcessed };
}

module.exports = { pullWooProducts, normalizeWooProduct };
