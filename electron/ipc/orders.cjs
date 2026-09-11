const { ipcMain } = require('electron');

function registerOrdersIPC(db, syncEngine) {
  ipcMain.handle('orders:list', async (_e, filters) => {
    return db.orders.list(filters);
  });

  ipcMain.handle('orders:get', async (_e, id) => {
    return db.orders.getById(id);
  });

  ipcMain.handle('orders:getByIds', async (_e, ids) => {
    return db.orders.getByIds(ids);
  });

  ipcMain.handle('orders:getMetrics', async (_e, storeId) => {
    return db.orders.getDashboardMetrics(storeId);
  });

  ipcMain.handle('orders:fulfill', async (_e, { orderId, trackingNumber, trackingCompany = 'PostEx', notifyCustomer = true }) => {
    const order = db.orders.getById(orderId);
    if (!order) throw new Error('Order not found');

    // 1. Update local database immediately (local-first)
    db.orders.updateLocalStatus(orderId, { fulfillment: 'fulfilled' });

    // 2. Queue mutation in Outbox for background pushing to Shopify / WooCommerce
    const outboxPayload = {
      orderId: order.id,
      remoteOrderId: order.remote_id,
      trackingNumber,
      trackingCompany,
      notifyCustomer
    };
    db.outbox.enqueue(order.store_id, 'fulfill_order', outboxPayload);

    // 3. Trigger immediate outbox processor attempt
    if (syncEngine && syncEngine.outboxWorker) {
      syncEngine.outboxWorker.processQueue().catch(err => console.error('[OrdersIPC] Outbox process error:', err));
    }

    return { success: true, orderId, fulfillment: 'fulfilled' };
  });

  ipcMain.handle('orders:batchFulfill', async (_e, { orderIds, trackingCompany = 'PostEx' }) => {
    const results = [];
    for (const id of orderIds) {
      const order = db.orders.getById(id);
      if (!order) continue;
      db.orders.updateLocalStatus(id, { fulfillment: 'fulfilled' });
      db.outbox.enqueue(order.store_id, 'fulfill_order', {
        orderId: order.id,
        remoteOrderId: order.remote_id,
        trackingCompany,
        notifyCustomer: true
      });
      results.push(id);
    }

    if (syncEngine && syncEngine.outboxWorker) {
      syncEngine.outboxWorker.processQueue().catch(err => console.error('[OrdersIPC] Batch outbox error:', err));
    }

    return { count: results.length, orderIds: results };
  });

  ipcMain.handle('orders:updateDetails', async (_e, { orderId, note, tags }) => {
    const order = db.orders.getById(orderId);
    if (!order) throw new Error('Order not found');

    db.orders.updateLocalStatus(orderId, { note, tags });
    db.outbox.enqueue(order.store_id, 'update_order', {
      orderId: order.id,
      remoteOrderId: order.remote_id,
      note,
      tags
    });

    if (syncEngine && syncEngine.outboxWorker) {
      syncEngine.outboxWorker.processQueue().catch(err => console.error('[OrdersIPC] Outbox error:', err));
    }

    return { success: true, order: db.orders.getById(orderId) };
  });
}

module.exports = { registerOrdersIPC };
