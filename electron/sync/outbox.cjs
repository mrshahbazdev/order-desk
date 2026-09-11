const vault = require('../security/vault.cjs');
const ShopifyGraphQLClient = require('./shopify/client.cjs');
const WooCommerceRESTClient = require('./woo/client.cjs');
const { fulfillShopifyOrder, updateShopifyOrderDetails, updateShopifyInventory } = require('./shopify/push.cjs');
const { fulfillWooOrder, updateWooOrderDetails, updateWooInventory } = require('./woo/push.cjs');

class OutboxWorker {
  constructor({ db, syncRepo, outboxRepo, storesRepo, broadcast }) {
    this.db = db;
    this.syncRepo = syncRepo;
    this.outboxRepo = outboxRepo;
    this.storesRepo = storesRepo;
    this.broadcast = broadcast;
    this.isProcessing = false;
  }

  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const pendingJobs = this.outboxRepo.getPending(10);
      for (const job of pendingJobs) {
        await this._processJob(job);
      }
    } catch (err) {
      console.error('[OutboxWorker] Error during queue processing:', err);
    } finally {
      this.isProcessing = false;
      if (this.broadcast) {
        this.broadcast('outbox:stats', this.outboxRepo.getStats());
      }
    }
  }

  async _processJob(job) {
    this.outboxRepo.markProcessing(job.id);
    let payload = {};
    try {
      payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : (job.payload || {});
    } catch {
      payload = job.payload || {};
    }

    // Normalize field variations (snake_case vs camelCase)
    const remoteOrderId = payload.remoteOrderId || payload.remote_id || payload.remoteId || payload.order_id || payload.orderId;
    const remoteVariantId = payload.remoteVariantId || payload.remote_variant_id || payload.remoteVariant || payload.variant_id;
    const trackingNumber = payload.trackingNumber || payload.tracking_number;
    const trackingCompany = payload.trackingCompany || payload.tracking_company || 'PostEx';
    const notifyCustomer = payload.notifyCustomer ?? payload.notify_customer ?? true;
    const isPartial = Boolean(payload.isPartial ?? payload.is_partial);
    const packedItems = payload.packedItems || payload.packed_items || [];
    const newStock = payload.newStock ?? payload.new_stock ?? payload.stock;
    const note = payload.note || payload.customerNote || payload.customer_note;
    const tags = payload.tags;
    const status = payload.status;

    try {
      const store = this.storesRepo.getById(job.store_id);
      if (!store) {
        // If store was deleted or is mock, mark done without crash
        console.warn(`[OutboxWorker] Store ID ${job.store_id} not found. Clearing job #${job.id}`);
        this.outboxRepo.markDone(job.id);
        return;
      }

      // Check for demo store or demo IDs
      const isDemoOrder = !remoteOrderId || String(remoteOrderId).startsWith('demo_') || String(remoteOrderId).startsWith('local_') || String(remoteOrderId).includes('sample');
      const isDemoVariant = !remoteVariantId || String(remoteVariantId).startsWith('demo_') || String(remoteVariantId).startsWith('local_');
      const isDemoStore = store.domain?.includes('demo') || store.credential_id?.includes('demo');

      if ((job.kind === 'fulfill_order' && isDemoOrder) || 
          (job.kind === 'update_inventory' && isDemoVariant) || 
          isDemoStore) {
        console.log(`[OutboxWorker] Simulated execution for local/demo job #${job.id} (${job.kind})`);
        this.outboxRepo.markDone(job.id);
        return;
      }

      const creds = vault.getSecret(store.credential_id);
      if (!creds) {
        throw new Error(`Credentials not found in vault for store ${store.domain}`);
      }

      if (store.platform === 'shopify') {
        const client = new ShopifyGraphQLClient({
          domain: store.domain,
          accessToken: creds.accessToken || creds.token
        });

        if (job.kind === 'fulfill_order') {
          await fulfillShopifyOrder({
            client,
            remoteOrderId,
            trackingNumber,
            trackingCompany,
            notifyCustomer,
            isPartial,
            packedItems
          });
        } else if (job.kind === 'update_order') {
          await updateShopifyOrderDetails({
            client,
            remoteOrderId,
            note,
            tags
          });
        } else if (job.kind === 'update_inventory') {
          await updateShopifyInventory({
            client,
            remoteVariantId,
            newStock
          });
        } else {
          console.warn(`[OutboxWorker] Unknown shopify mutation kind: ${job.kind}`);
        }
      } else if (store.platform === 'woo') {
        const client = new WooCommerceRESTClient({
          domain: store.domain,
          consumerKey: creds.consumerKey || creds.key,
          consumerSecret: creds.consumerSecret || creds.secret
        });

        if (job.kind === 'fulfill_order') {
          await fulfillWooOrder({
            client,
            remoteOrderId,
            trackingNumber,
            trackingCompany,
            customerNote: note || '',
            isPartial,
            packedItems
          });
        } else if (job.kind === 'update_order') {
          await updateWooOrderDetails({
            client,
            remoteOrderId,
            note,
            status
          });
        } else if (job.kind === 'update_inventory') {
          await updateWooInventory({
            client,
            remoteVariantId,
            newStock
          });
        } else {
          console.warn(`[OutboxWorker] Unknown woo mutation kind: ${job.kind}`);
        }
      }

      this.outboxRepo.markDone(job.id);
      this.syncRepo.log({
        store_id: job.store_id,
        resource: 'outbox',
        type: 'push',
        message: `Successfully processed ${job.kind} for job #${job.id}`,
        details: { jobId: job.id, kind: job.kind }
      });
    } catch (err) {
      console.error(`[OutboxWorker] Job #${job.id} failed:`, err.message);
      const attempts = (job.attempts || 0) + 1;
      this.outboxRepo.markFailed(job.id, err.message, attempts);
      this.syncRepo.log({
        store_id: job.store_id,
        resource: 'outbox',
        type: 'error',
        message: `Job #${job.id} failed: ${err.message}`,
        details: { jobId: job.id, error: err.message, attempts }
      });
    }
  }
}

module.exports = OutboxWorker;
