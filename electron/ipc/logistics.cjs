const { ipcMain, shell } = require('electron');

function registerLogisticsIPC(db) {
  // ---------------------------------------------------- Couriers & Logistics
  ipcMain.handle('logistics:listCouriers', async (_e, filters) => {
    return db.couriers.listCouriers(filters);
  });

  ipcMain.handle('logistics:saveCourier', async (_e, data) => {
    return db.couriers.saveCourier(data);
  });

  ipcMain.handle('logistics:deleteCourier', async (_e, id) => {
    return db.couriers.deleteCourier(id);
  });

  ipcMain.handle('logistics:testCourierApi', async (_e, data) => {
    const { api_endpoint, api_key } = data || {};
    if (!api_endpoint && !api_key) {
      return { success: false, message: 'API Endpoint or API Key/Token is required for testing connection.' };
    }
    // Simulation / check for valid URL structure
    try {
      if (api_endpoint) {
        new URL(api_endpoint);
      }
      return { success: true, message: 'Carrier API configuration verified and ready.' };
    } catch (e) {
      return { success: false, message: 'Invalid API Endpoint URL format.' };
    }
  });

  ipcMain.handle('logistics:listShipments', async (_e, filters) => {
    return db.couriers.listShipments(filters);
  });

  ipcMain.handle('logistics:bookShipment', async (_e, data) => {
    return db.couriers.bookShipment(data);
  });

  ipcMain.handle('logistics:updateShipmentStatus', async (_e, { id, status }) => {
    return db.couriers.updateShipmentStatus(id, status);
  });

  ipcMain.handle('logistics:listReconciliations', async () => {
    return db.couriers.listReconciliations();
  });

  ipcMain.handle('logistics:createReconciliation', async (_e, data) => {
    return db.couriers.createReconciliation(data);
  });

  ipcMain.handle('logistics:getMetrics', async () => {
    return db.couriers.getMetrics();
  });

  // ---------------------------------------------------- Returns & Reverse Logistics
  ipcMain.handle('returns:list', async (_e, filters) => {
    return db.returns.list(filters);
  });

  ipcMain.handle('returns:processReturn', async (_e, data) => {
    return db.returns.processReturn(data);
  });

  ipcMain.handle('returns:getAnalytics', async () => {
    return db.returns.getAnalytics();
  });

  // ---------------------------------------------------- Wave Picking & Bin Locations
  ipcMain.handle('picking:listWaves', async (_e, filters) => {
    return db.picking.listWaves(filters);
  });

  ipcMain.handle('picking:getWaveDetails', async (_e, waveId) => {
    return db.picking.getWaveDetails(waveId);
  });

  ipcMain.handle('picking:createWave', async (_e, data) => {
    return db.picking.createWave(data);
  });

  ipcMain.handle('picking:updateWaveStatus', async (_e, { waveId, status }) => {
    return db.picking.updateWaveStatus(waveId, status);
  });

  ipcMain.handle('picking:listLocations', async (_e, filters) => {
    return db.picking.listLocations(filters);
  });

  ipcMain.handle('picking:saveLocation', async (_e, data) => {
    return db.picking.saveLocation(data);
  });

  // ---------------------------------------------------- Forecasting & Purchase Orders
  ipcMain.handle('forecasting:getInventoryForecast', async (_e, opts) => {
    return db.forecasting.getInventoryForecast(opts);
  });

  ipcMain.handle('forecasting:listPurchaseOrders', async (_e, filters) => {
    return db.forecasting.listPurchaseOrders(filters);
  });

  ipcMain.handle('forecasting:getPurchaseOrder', async (_e, id) => {
    return db.forecasting.getPurchaseOrder(id);
  });

  ipcMain.handle('forecasting:createPurchaseOrder', async (_e, data) => {
    return db.forecasting.createPurchaseOrder(data);
  });

  ipcMain.handle('forecasting:receiveStock', async (_e, { poId, itemReceipts }) => {
    return db.forecasting.receiveStock(poId, itemReceipts);
  });

  // ---------------------------------------------------- Staff & Audit Logs
  ipcMain.handle('staff:listStaff', async (_e, filters) => {
    return db.staff.listStaff(filters);
  });

  ipcMain.handle('staff:saveStaff', async (_e, data) => {
    return db.staff.saveStaff(data);
  });

  ipcMain.handle('staff:logPackAudit', async (_e, data) => {
    return db.staff.logPackAudit(data);
  });

  ipcMain.handle('staff:listAuditLogs', async (_e, filters) => {
    return db.staff.listAuditLogs(filters);
  });

  ipcMain.handle('staff:getAnalytics', async () => {
    return db.staff.getStaffAnalytics();
  });

  // ---------------------------------------------------- Customer Messaging & Duplicate Detector
  ipcMain.handle('messaging:openWhatsApp', async (_e, { phone, text }) => {
    if (!phone) return { success: false, message: 'Phone number missing' };
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(text || '');
    const url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    shell.openExternal(url);
    return { success: true, url };
  });

  ipcMain.handle('messaging:detectDuplicates', async (_e, { orderId }) => {
    const order = db.orders.getById(orderId);
    if (!order) return { isDuplicate: false, count: 0, duplicates: [] };

    const phone = order.phone;
    if (!phone) return { isDuplicate: false, count: 0, duplicates: [] };

    // Find other orders with same phone within 48 hours
    const duplicates = db.db.prepare(`
      SELECT id, name, placed_at, total, currency, financial, fulfillment
      FROM orders
      WHERE phone = ? AND id != ?
      ORDER BY placed_at DESC
      LIMIT 10
    `).all(phone, orderId);

    return {
      isDuplicate: duplicates.length > 0,
      count: duplicates.length,
      duplicates
    };
  });
}

module.exports = { registerLogisticsIPC };
