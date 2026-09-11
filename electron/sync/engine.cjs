const vault = require('../security/vault.cjs');
const ShopifyGraphQLClient = require('./shopify/client.cjs');
const WooCommerceRESTClient = require('./woo/client.cjs');
const { pullShopifyOrders } = require('./shopify/pull-orders.cjs');
const { pullShopifyProducts } = require('./shopify/pull-products.cjs');
const { pullWooOrders } = require('./woo/pull-orders.cjs');
const { pullWooProducts } = require('./woo/pull-products.cjs');
const OutboxWorker = require('./outbox.cjs');

class SyncEngine {
  constructor(db, broadcastFn) {
    this.db = db;
    this.broadcast = broadcastFn || (() => {});
    this.outboxWorker = new OutboxWorker({
      db: this.db,
      syncRepo: this.db.sync,
      outboxRepo: this.db.outbox,
      storesRepo: this.db.stores,
      broadcast: this.broadcast
    });
    this.syncIntervalId = null;
    this.outboxIntervalId = null;
    this.activeSyncs = new Set();
  }

  start() {
    console.log('[SyncEngine] Starting periodic sync scheduler & outbox worker...');
    
    // Process outbox every 15 seconds
    this.outboxIntervalId = setInterval(() => {
      this.outboxWorker.processQueue().catch(err => console.error('[SyncEngine] Outbox drain error:', err));
    }, 15000);

    // Run incremental sync every 5 minutes
    this.syncIntervalId = setInterval(() => {
      this.syncAllActiveStores({ isBackground: true }).catch(err => console.error('[SyncEngine] Periodic sync error:', err));
    }, 5 * 60 * 1000);

    // Initial check
    setTimeout(() => {
      this.outboxWorker.processQueue();
    }, 3000);
  }

  stop() {
    if (this.syncIntervalId) clearInterval(this.syncIntervalId);
    if (this.outboxIntervalId) clearInterval(this.outboxIntervalId);
    console.log('[SyncEngine] Stopped.');
  }

  async syncAllActiveStores({ isBackground = false } = {}) {
    const stores = this.db.stores.list().filter(s => s.status === 'active');
    const results = [];

    for (const store of stores) {
      try {
        const res = await this.syncStore(store.id);
        results.push({ storeId: store.id, success: true, ...res });
      } catch (err) {
        console.error(`[SyncEngine] Store ${store.domain} sync failed:`, err);
        results.push({ storeId: store.id, success: false, error: err.message });
      }
    }

    return results;
  }

  async syncStore(storeId) {
    if (this.activeSyncs.has(storeId)) {
      console.log(`[SyncEngine] Store ${storeId} is already syncing, skipping duplicate call`);
      return { status: 'already_syncing' };
    }

    this.activeSyncs.add(storeId);
    this._broadcastStatus(storeId, 'syncing', 'Syncing orders & products...');

    try {
      const store = this.db.stores.getById(storeId);
      if (!store) throw new Error(`Store #${storeId} not found`);

      const creds = vault.getSecret(store.credential_id);
      if (!creds) throw new Error(`Credentials missing in vault for store ${store.domain}`);

      let orderRes = { totalProcessed: 0 };
      let productRes = { totalProcessed: 0 };

      if (store.platform === 'shopify') {
        const client = new ShopifyGraphQLClient({
          domain: store.domain,
          accessToken: creds.accessToken || creds.token
        });

        // 1. Pull Orders
        orderRes = await pullShopifyOrders({
          client,
          storeId: store.id,
          db: this.db,
          onProgress: (prog) => this.broadcast('sync:progress', prog)
        });

        // 2. Pull Products
        productRes = await pullShopifyProducts({
          client,
          storeId: store.id,
          db: this.db,
          onProgress: (prog) => this.broadcast('sync:progress', prog)
        });
      } else if (store.platform === 'woo') {
        const client = new WooCommerceRESTClient({
          domain: store.domain,
          consumerKey: creds.consumerKey || creds.key,
          consumerSecret: creds.consumerSecret || creds.secret
        });

        // 1. Pull Orders
        orderRes = await pullWooOrders({
          client,
          storeId: store.id,
          db: this.db,
          onProgress: (prog) => this.broadcast('sync:progress', prog)
        });

        // 2. Pull Products
        productRes = await pullWooProducts({
          client,
          storeId: store.id,
          db: this.db,
          onProgress: (prog) => this.broadcast('sync:progress', prog)
        });
      }

      this._broadcastStatus(storeId, 'idle', 'Sync completed');
      this.broadcast('sync:complete', { storeId, orderRes, productRes });

      // Drain any pending outbox mutations
      this.outboxWorker.processQueue();

      return {
        ordersSynced: orderRes.totalProcessed,
        productsSynced: productRes.totalProcessed
      };
    } catch (err) {
      if (err.authFailed) {
        this.db.stores.updateStatus(storeId, 'auth_failed');
        this._broadcastStatus(storeId, 'auth_failed', 'Authentication failed. Please reconnect.');
      } else {
        this._broadcastStatus(storeId, 'error', err.message);
      }

      this.db.sync.log({
        store_id: storeId,
        resource: 'all',
        type: 'error',
        message: err.message,
        details: err.stack
      });

      throw err;
    } finally {
      this.activeSyncs.delete(storeId);
    }
  }

  _broadcastStatus(storeId, status, message) {
    this.broadcast('sync:status', { storeId, status, message, timestamp: new Date().toISOString() });
  }
}

module.exports = SyncEngine;
