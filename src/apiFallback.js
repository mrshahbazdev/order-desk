/**
 * Fallback stub for window.api when running outside of Electron (e.g. standalone browser).
 * Prevents TypeErrors and provides informative logging.
 */
if (typeof window !== 'undefined' && !window.api) {
  console.warn('[Order Desk] window.api is not available. Running in browser fallback mode.');

  const noopAsync = async () => null;
  const noopArray = async () => [];

  const getStoredStores = () => {
    try {
      const s = localStorage.getItem('od_mock_stores');
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  };
  const saveStoredStores = (list) => {
    try { localStorage.setItem('od_mock_stores', JSON.stringify(list)); } catch {}
  };

  window.api = {
    isFallback: true,
    stores: {
      list: async () => getStoredStores(),
      get: async (id) => getStoredStores().find(s => s.id === id) || null,
      create: async (data) => {
        const list = getStoredStores();
        const existingIdx = list.findIndex(s => s.domain.toLowerCase() === data.domain.toLowerCase());
        const newStore = {
          id: existingIdx >= 0 ? list[existingIdx].id : Date.now(),
          platform: data.platform || 'shopify',
          label: data.label || data.domain,
          domain: data.domain,
          currency: data.currency || 'PKR',
          status: 'active',
          order_count: 0,
          product_count: 0,
          created_at: new Date().toISOString()
        };
        if (existingIdx >= 0) {
          list[existingIdx] = { ...list[existingIdx], ...newStore };
        } else {
          list.push(newStore);
        }
        saveStoredStores(list);
        return newStore;
      },
      update: async (payload) => {
        const list = getStoredStores();
        const idx = list.findIndex(s => s.id === payload.id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...payload.fields };
          saveStoredStores(list);
          return list[idx];
        }
        return null;
      },
      delete: async (id) => {
        const list = getStoredStores().filter(s => s.id !== id);
        saveStoredStores(list);
        return { success: true };
      },
      testConnection: async (data) => {
        const domain = data?.domain || 'my-store';
        return {
          success: true,
          shop: {
            name: domain.replace('.myshopify.com', ''),
            myshopifyDomain: domain.includes('.') ? domain : `${domain}.myshopify.com`,
            currencyCode: 'PKR',
            ianaTimezone: 'Asia/Karachi'
          },
          info: { status: 'ok' }
        };
      }
    },
    orders: {
      list: async () => ({ orders: [], total: 0 }),
      get: noopAsync,
      getByIds: noopArray,
      getMetrics: async () => ({
        totalOrders: 0,
        totalRevenue: 0,
        unfulfilledCount: 0,
        paidCount: 0,
        todayCount: 0,
        todayRevenue: 0
      }),
      fulfill: noopAsync,
      batchFulfill: noopAsync,
      updateDetails: noopAsync
    },
    products: {
      list: async () => ({ products: [], total: 0 }),
      get: noopAsync,
      create: async (data) => ({ success: true, product: { id: 1, ...data } }),
      updateStock: noopAsync,
      addVariant: noopAsync,
      delete: noopAsync,
      seedDemo: async () => ({ success: true, count: 4 })
    },
    print: {
      getPrinters: noopArray,
      previewHTML: async () => '',
      generatePDF: noopAsync,
      directPrint: noopAsync,
      getTemplates: noopArray,
      saveTemplate: noopAsync,
      deleteTemplate: noopAsync,
      resetTemplates: noopArray,
      renderCustomTemplate: async () => '',
      listDocuments: noopArray,
      openPath: noopAsync
    },
    sync: {
      triggerStore: noopAsync,
      triggerAll: noopAsync,
      getLogs: noopArray,
      clearLogs: noopAsync,
      getOutboxJobs: noopArray,
      getOutboxStats: async () => ({ pending: 0, processing: 0, failed: 0, done: 0 }),
      retryOutboxJob: noopAsync,
      deleteOutboxJob: noopAsync,
      flushOutbox: async () => ({ pending: 0, processing: 0, failed: 0, done: 0 }),
      retryAllFailed: async () => ({ pending: 0, processing: 0, failed: 0, done: 0 })
    },
    settings: {
      getAll: async () => ({}),
      get: async (_k, def) => def,
      set: noopAsync,
      getAppInfo: async () => ({ version: '1.0.0', isPackaged: false })
    },
    pack: {
      lookup: noopAsync,
      scan: noopAsync,
      manualPack: noopAsync,
      finish: noopAsync,
      abandon: noopAsync,
      next: noopAsync,
      createSample: noopAsync,
      queue: noopArray,
      stats: async () => ({ summary: { total_packed: 0, avg_seconds: 0 }, daily: [], problemCount: 0 }),
      problems: noopArray
    },
    app: {
      getDiagnostics: async () => ({ platform: 'browser', node: 'none' }),
      openUserData: noopAsync,
      deleteAllData: noopAsync
    },
    license: {
      get: async () => ({
        valid: true,
        tier: 'business',
        label: 'Business',
        email: 'admin@orderdesk.local',
        maxStores: Infinity,
        maxHistoryDays: null,
        batchPrintLimit: Infinity,
        customTemplates: true,
        allDocumentKinds: true,
        active: true
      }),
      activate: async () => ({
        valid: true,
        tier: 'business',
        label: 'Business',
        email: 'admin@orderdesk.local',
        maxStores: Infinity,
        maxHistoryDays: null,
        batchPrintLimit: Infinity,
        customTemplates: true,
        allDocumentKinds: true,
        active: true
      }),
      deactivate: noopAsync
    },
    on: () => () => {}
  };
}
