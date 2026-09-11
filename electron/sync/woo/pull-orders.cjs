function toMinorUnits(amountStr) {
  if (!amountStr) return 0;
  const num = parseFloat(amountStr);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

function normalizeWooOrder(storeId, raw) {
  const currency = raw.currency || 'PKR';
  const total = toMinorUnits(raw.total);
  const shipping = toMinorUnits(raw.shipping_total);
  const tax = toMinorUnits(raw.total_tax);
  const discount = toMinorUnits(raw.discount_total);
  const subtotal = Math.max(0, total - shipping - tax + discount);

  let financial = 'pending';
  let fulfillment = 'unfulfilled';

  const status = (raw.status || '').toLowerCase();
  if (status === 'completed') {
    financial = 'paid';
    fulfillment = 'fulfilled';
  } else if (status === 'processing') {
    financial = 'paid';
    fulfillment = 'unfulfilled';
  } else if (status === 'on-hold' || status === 'pending') {
    financial = 'pending';
    fulfillment = 'unfulfilled';
  } else if (status === 'refunded') {
    financial = 'refunded';
    fulfillment = 'restocked';
  } else if (status === 'cancelled' || status === 'failed') {
    financial = 'voided';
    fulfillment = 'unfulfilled';
  }

  const customer = {
    id: raw.customer_id,
    firstName: raw.billing?.first_name || '',
    lastName: raw.billing?.last_name || '',
    email: raw.billing?.email || '',
    phone: raw.billing?.phone || ''
  };

  const shippingAddress = {
    name: `${raw.shipping?.first_name || ''} ${raw.shipping?.last_name || ''}`.trim() || `${customer.firstName} ${customer.lastName}`.trim(),
    address1: raw.shipping?.address_1 || raw.billing?.address_1 || '',
    address2: raw.shipping?.address_2 || raw.billing?.address_2 || '',
    city: raw.shipping?.city || raw.billing?.city || '',
    province: raw.shipping?.state || raw.billing?.state || '',
    zip: raw.shipping?.postcode || raw.billing?.postcode || '',
    country: raw.shipping?.country || raw.billing?.country || '',
    phone: raw.shipping?.phone || raw.billing?.phone || ''
  };

  const order = {
    store_id: storeId,
    remote_id: String(raw.id),
    name: `#${raw.number || raw.id}`,
    number: parseInt(raw.number || raw.id, 10) || null,
    email: raw.billing?.email || null,
    phone: raw.billing?.phone || null,
    financial,
    fulfillment,
    currency,
    subtotal,
    shipping,
    tax,
    discount,
    total,
    customer_json: JSON.stringify(customer),
    ship_json: JSON.stringify(shippingAddress),
    bill_json: JSON.stringify(raw.billing || {}),
    tags: Array.isArray(raw.meta_data) ? raw.meta_data.map(m => m.key).join(', ') : '',
    note: raw.customer_note || '',
    placed_at: raw.date_created_gmt ? raw.date_created_gmt + 'Z' : (raw.date_created || new Date().toISOString()),
    updated_at: raw.date_modified_gmt ? raw.date_modified_gmt + 'Z' : (raw.date_modified || new Date().toISOString()),
    raw: JSON.stringify(raw)
  };

  const items = (raw.line_items || []).map(li => {
    const itemPrice = toMinorUnits(li.price);
    const itemTotal = toMinorUnits(li.total);

    return {
      remote_id: String(li.id),
      sku: li.sku || '',
      title: li.name || '',
      variant: (li.meta_data || []).map(m => `${m.display_key || m.key}: ${m.display_value || m.value}`).join(', '),
      qty: li.quantity || 1,
      price: itemPrice,
      total: itemTotal,
      tax: toMinorUnits(li.total_tax),
      image_url: li.image?.src || null
    };
  });

  return { order, items };
}

async function pullWooOrders({ client, storeId, db, onProgress }) {
  const syncRepo = db.sync;
  const ordersRepo = db.orders;

  const syncState = syncRepo.getState(storeId, 'orders') || {};
  const isBackfill = !syncState.backfill_done;
  let page = 1;
  const perPage = 50;
  let totalProcessed = 0;
  let maxUpdatedAt = syncState.watermark || null;

  const params = {
    per_page: perPage,
    page: 1,
    order: 'asc',
    orderby: 'modified'
  };

  if (!isBackfill && syncState.watermark) {
    // 5-minute overlap window
    const watermarkDate = new Date(new Date(syncState.watermark).getTime() - 5 * 60 * 1000);
    params.modified_after = watermarkDate.toISOString();
  }

  let totalPages = 1;
  do {
    params.page = page;
    const response = await client.request('orders', { params });
    const ordersList = response.data || [];
    totalPages = response.totalPages || 1;

    if (!ordersList.length) break;

    const normalizedList = [];
    for (const raw of ordersList) {
      normalizedList.push(normalizeWooOrder(storeId, raw));
      const mod = raw.date_modified_gmt ? raw.date_modified_gmt + 'Z' : raw.date_modified;
      if (mod && (!maxUpdatedAt || new Date(mod) > new Date(maxUpdatedAt))) {
        maxUpdatedAt = mod;
      }
    }

    const saved = ordersRepo.upsertPage(normalizedList);
    totalProcessed += saved;

    // Persist sync state
    syncRepo.setState({
      store_id: storeId,
      resource: 'orders',
      cursor: String(page),
      watermark: maxUpdatedAt,
      backfill_done: page >= totalPages ? 1 : (isBackfill ? 0 : 1)
    });

    if (onProgress) {
      onProgress({
        storeId,
        resource: 'orders',
        processed: totalProcessed,
        page,
        totalPages,
        isBackfill
      });
    }

    page++;
  } while (page <= totalPages);

  syncRepo.log({
    store_id: storeId,
    resource: 'orders',
    type: isBackfill ? 'backfill' : 'incremental',
    message: `Synced ${totalProcessed} WooCommerce orders`,
    details: { totalProcessed, watermark: maxUpdatedAt }
  });

  return { totalProcessed, watermark: maxUpdatedAt };
}

module.exports = { pullWooOrders, normalizeWooOrder };
