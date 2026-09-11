const { ipcMain } = require('electron');
const LicenseManager = require('../security/license.cjs');
const vault = require('../security/vault.cjs');
const ShopifyGraphQLClient = require('../sync/shopify/client.cjs');
const WooCommerceRESTClient = require('../sync/woo/client.cjs');

function registerStoresIPC(db, syncEngine) {
  const licenseManager = new LicenseManager(db);
  ipcMain.handle('stores:list', async () => {
    return db.stores.list();
  });

  ipcMain.handle('stores:get', async (_e, id) => {
    return db.stores.getById(id);
  });

  ipcMain.handle('stores:create', async (_e, payload) => {
    const { platform, label, domain, currency = 'PKR', timezone = 'UTC', credentials } = payload;

    // Tier gate — before this, every install behaved as Business tier
    licenseManager.assertCanAddStore();

    // Save credentials in vault
    const secretId = vault.generateSecretId();
    vault.setSecret(secretId, credentials);

    const store = db.stores.create({
      platform,
      label,
      domain,
      currency,
      timezone,
      credential_id: secretId,
      status: 'active'
    });

    // Automatically trigger initial backfill sync in background
    if (syncEngine) {
      setTimeout(() => {
        syncEngine.syncStore(store.id).catch(err => console.error('[StoresIPC] Initial sync error:', err));
      }, 500);
    }

    return store;
  });

  ipcMain.handle('stores:update', async (_e, { id, fields, credentials }) => {
    const store = db.stores.getById(id);
    if (!store) throw new Error('Store not found');

    if (credentials) {
      vault.setSecret(store.credential_id, credentials);
    }

    return db.stores.update(id, fields);
  });

  ipcMain.handle('stores:delete', async (_e, id) => {
    const store = db.stores.getById(id);
    if (store && store.credential_id) {
      vault.deleteSecret(store.credential_id);
    }
    return db.stores.delete(id);
  });

  ipcMain.handle('stores:testConnection', async (_e, { platform, domain, credentials }) => {
    if (platform === 'shopify') {
      const client = new ShopifyGraphQLClient({
        domain,
        accessToken: credentials.accessToken || credentials.token
      });
      const shopInfo = await client.testConnection();
      return { success: true, shop: shopInfo };
    } else if (platform === 'woo') {
      const client = new WooCommerceRESTClient({
        domain,
        consumerKey: credentials.consumerKey || credentials.key,
        consumerSecret: credentials.consumerSecret || credentials.secret
      });
      const info = await client.testConnection();
      return { success: true, info };
    }
    throw new Error(`Unsupported platform: ${platform}`);
  });
}

module.exports = { registerStoresIPC };
