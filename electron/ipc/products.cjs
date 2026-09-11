const { ipcMain } = require('electron');

function registerProductsIPC(db, syncEngine) {
  ipcMain.handle('products:list', async (_e, filters) => {
    return db.products.list(filters);
  });

  ipcMain.handle('products:get', async (_e, id) => {
    return db.products.getById(id);
  });

  ipcMain.handle('products:updateStock', async (_e, { variantId, stock }) => {
    const updated = db.products.updateVariantStock(variantId, stock);
    if (syncEngine && syncEngine.outboxWorker) {
      syncEngine.outboxWorker.processQueue().catch(() => {});
    }
    return { success: true, variant: updated };
  });

  ipcMain.handle('products:create', async (_e, productData) => {
    const created = db.products.createProduct(productData);
    return { success: true, product: created };
  });

  ipcMain.handle('products:addVariant', async (_e, { productId, variantData }) => {
    const variant = db.products.addVariantToProduct(productId, variantData);
    return { success: true, variant };
  });

  ipcMain.handle('products:updateVariant', async (_e, { variantId, data }) => {
    const updated = db.products.updateVariantDetails(variantId, data);
    return { success: true, variant: updated };
  });

  ipcMain.handle('products:autoGenerateMissing', async (_e, filters) => {
    return db.products.autoGenerateMissingSkusAndBarcodes(filters);
  });

  ipcMain.handle('products:delete', async (_e, id) => {
    return db.products.deleteProduct(id);
  });

  ipcMain.handle('products:seedDemo', async (_e, storeId) => {
    return db.products.seedDemoCatalog(storeId);
  });
}

module.exports = { registerProductsIPC };
