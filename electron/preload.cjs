const { contextBridge, ipcRenderer } = require('electron');

const api = {
  stores: {
    list: () => ipcRenderer.invoke('stores:list'),
    get: (id) => ipcRenderer.invoke('stores:get', id),
    create: (data) => ipcRenderer.invoke('stores:create', data),
    update: (payload) => ipcRenderer.invoke('stores:update', payload),
    delete: (id) => ipcRenderer.invoke('stores:delete', id),
    testConnection: (data) => ipcRenderer.invoke('stores:testConnection', data)
  },
  orders: {
    list: (filters) => ipcRenderer.invoke('orders:list', filters),
    get: (id) => ipcRenderer.invoke('orders:get', id),
    getByIds: (ids) => ipcRenderer.invoke('orders:getByIds', ids),
    getMetrics: (storeId) => ipcRenderer.invoke('orders:getMetrics', storeId),
    fulfill: (data) => ipcRenderer.invoke('orders:fulfill', data),
    batchFulfill: (data) => ipcRenderer.invoke('orders:batchFulfill', data),
    updateDetails: (data) => ipcRenderer.invoke('orders:updateDetails', data)
  },
  products: {
    list: (filters) => ipcRenderer.invoke('products:list', filters),
    get: (id) => ipcRenderer.invoke('products:get', id),
    create: (data) => ipcRenderer.invoke('products:create', data),
    updateStock: (data) => ipcRenderer.invoke('products:updateStock', data),
    updateVariant: (data) => ipcRenderer.invoke('products:updateVariant', data),
    autoGenerateMissing: (filters) => ipcRenderer.invoke('products:autoGenerateMissing', filters),
    addVariant: (data) => ipcRenderer.invoke('products:addVariant', data),
    delete: (id) => ipcRenderer.invoke('products:delete', id),
    seedDemo: (storeId) => ipcRenderer.invoke('products:seedDemo', storeId)
  },
  print: {
    getPrinters: () => ipcRenderer.invoke('print:getPrinters'),
    previewHTML: (data) => ipcRenderer.invoke('print:previewHTML', data),
    generatePDF: (data) => ipcRenderer.invoke('print:generatePDF', data),
    directPrint: (data) => ipcRenderer.invoke('print:directPrint', data),
    getTemplates: () => ipcRenderer.invoke('print:getTemplates'),
    saveTemplate: (data) => ipcRenderer.invoke('print:saveTemplate', data),
    deleteTemplate: (id) => ipcRenderer.invoke('print:deleteTemplate', id),
    resetTemplates: () => ipcRenderer.invoke('print:resetTemplates'),
    listDocuments: (filters) => ipcRenderer.invoke('print:listDocuments', filters),
    deleteDocument: (id) => ipcRenderer.invoke('print:deleteDocument', id),
    clearAllDocuments: (kind) => ipcRenderer.invoke('print:clearAllDocuments', kind),
    openPath: (path) => ipcRenderer.invoke('print:openPath', path)
  },
  sync: {
    triggerStore: (storeId) => ipcRenderer.invoke('sync:triggerStore', storeId),
    triggerAll: () => ipcRenderer.invoke('sync:triggerAll'),
    getLogs: (limit) => ipcRenderer.invoke('sync:getLogs', limit),
    clearLogs: () => ipcRenderer.invoke('sync:clearLogs'),
    getOutboxJobs: (filters) => ipcRenderer.invoke('sync:getOutboxJobs', filters),
    getOutboxStats: () => ipcRenderer.invoke('sync:getOutboxStats'),
    retryOutboxJob: (id) => ipcRenderer.invoke('sync:retryOutboxJob', id),
    deleteOutboxJob: (id) => ipcRenderer.invoke('sync:deleteOutboxJob', id),
    flushOutbox: () => ipcRenderer.invoke('sync:flushOutbox'),
    retryAllFailed: () => ipcRenderer.invoke('sync:retryAllFailed')
  },
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    get: (key, def) => ipcRenderer.invoke('settings:get', key, def),
    set: (key, val) => ipcRenderer.invoke('settings:set', key, val),
    getAppInfo: () => ipcRenderer.invoke('settings:getAppInfo')
  },
  pack: {
    lookup: (code) => ipcRenderer.invoke('pack:lookup', code),
    scan: (data) => ipcRenderer.invoke('pack:scan', data),
    manualPack: (data) => ipcRenderer.invoke('pack:manualPack', data),
    finish: (data) => ipcRenderer.invoke('pack:finish', data),
    abandon: (id) => ipcRenderer.invoke('pack:abandon', id),
    next: () => ipcRenderer.invoke('pack:next'),
    createSample: () => ipcRenderer.invoke('pack:createSample'),
    queue: (opts) => ipcRenderer.invoke('pack:queue', opts),
    stats: (opts) => ipcRenderer.invoke('pack:stats', opts),
    problems: (opts) => ipcRenderer.invoke('pack:problems', opts)
  },
  logistics: {
    listCouriers: (filters) => ipcRenderer.invoke('logistics:listCouriers', filters),
    saveCourier: (data) => ipcRenderer.invoke('logistics:saveCourier', data),
    deleteCourier: (id) => ipcRenderer.invoke('logistics:deleteCourier', id),
    testCourierApi: (data) => ipcRenderer.invoke('logistics:testCourierApi', data),
    listShipments: (filters) => ipcRenderer.invoke('logistics:listShipments', filters),
    bookShipment: (data) => ipcRenderer.invoke('logistics:bookShipment', data),
    updateShipmentStatus: (data) => ipcRenderer.invoke('logistics:updateShipmentStatus', data),
    listReconciliations: () => ipcRenderer.invoke('logistics:listReconciliations'),
    createReconciliation: (data) => ipcRenderer.invoke('logistics:createReconciliation', data),
    getMetrics: () => ipcRenderer.invoke('logistics:getMetrics')
  },
  returns: {
    list: (filters) => ipcRenderer.invoke('returns:list', filters),
    processReturn: (data) => ipcRenderer.invoke('returns:processReturn', data),
    getAnalytics: () => ipcRenderer.invoke('returns:getAnalytics')
  },
  picking: {
    listWaves: (filters) => ipcRenderer.invoke('picking:listWaves', filters),
    getWaveDetails: (waveId) => ipcRenderer.invoke('picking:getWaveDetails', waveId),
    createWave: (data) => ipcRenderer.invoke('picking:createWave', data),
    updateWaveStatus: (data) => ipcRenderer.invoke('picking:updateWaveStatus', data),
    listLocations: (filters) => ipcRenderer.invoke('picking:listLocations', filters),
    saveLocation: (data) => ipcRenderer.invoke('picking:saveLocation', data)
  },
  forecasting: {
    getInventoryForecast: (opts) => ipcRenderer.invoke('forecasting:getInventoryForecast', opts),
    listPurchaseOrders: (filters) => ipcRenderer.invoke('forecasting:listPurchaseOrders', filters),
    getPurchaseOrder: (id) => ipcRenderer.invoke('forecasting:getPurchaseOrder', id),
    createPurchaseOrder: (data) => ipcRenderer.invoke('forecasting:createPurchaseOrder', data),
    receiveStock: (data) => ipcRenderer.invoke('forecasting:receiveStock', data)
  },
  staff: {
    listStaff: (filters) => ipcRenderer.invoke('staff:listStaff', filters),
    saveStaff: (data) => ipcRenderer.invoke('staff:saveStaff', data),
    logPackAudit: (data) => ipcRenderer.invoke('staff:logPackAudit', data),
    listAuditLogs: (filters) => ipcRenderer.invoke('staff:listAuditLogs', filters),
    getAnalytics: () => ipcRenderer.invoke('staff:getAnalytics')
  },
  messaging: {
    openWhatsApp: (data) => ipcRenderer.invoke('messaging:openWhatsApp', data),
    detectDuplicates: (data) => ipcRenderer.invoke('messaging:detectDuplicates', data)
  },
  app: {
    getDiagnostics: () => ipcRenderer.invoke('app:getDiagnostics'),
    openUserData: () => ipcRenderer.invoke('app:openUserData'),
    deleteAllData: () => ipcRenderer.invoke('app:deleteAllData')
  },
  license: {
    get: () => ipcRenderer.invoke('license:get'),
    activate: (key) => ipcRenderer.invoke('license:activate', key),
    deactivate: () => ipcRenderer.invoke('license:deactivate')
  },
  demo: {
    status: () => ipcRenderer.invoke('demo:status'),
    load: () => ipcRenderer.invoke('demo:load'),
    clear: () => ipcRenderer.invoke('demo:clear')
  },
  on: (channel, callback) => {
    const allowedChannels = new Set([
      'sync:status',
      'sync:progress',
      'sync:complete',
      'outbox:stats',
      'oauth:connected',
      'notification'
    ]);
    if (!allowedChannels.has(channel)) return () => {};
    const subscription = (_event, ...args) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  }
};

contextBridge.exposeInMainWorld('api', api);

