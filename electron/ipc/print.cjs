const { ipcMain, shell } = require('electron');
const { getAvailablePrinters } = require('../print/printers.cjs');
const PrintRenderer = require('../print/render.cjs');
const LicenseManager = require('../security/license.cjs');

function registerPrintIPC(db) {
  const renderer = new PrintRenderer(db);
  const licenseManager = new LicenseManager(db);

  // Batch size is a paid feature; check it once, at the door.
  const gateBatch = (data) => {
    const n = (data && data.orders && data.orders.length)
      || (data && data.items && data.items.reduce((s, i) => s + (i.copies || 1), 0))
      || 1;
    licenseManager.assertBatchSize(n);
  };

  ipcMain.handle('print:getPrinters', async () => {
    return getAvailablePrinters();
  });

  ipcMain.handle('print:previewHTML', async (_e, { kind, data, options }) => {
    return renderer.renderToHTML({ kind, data, options });
  });

  ipcMain.handle('print:generatePDF', async (_e, { kind, data, options }) => {
    gateBatch(data);
    return renderer.generatePDF({ kind, data, options });
  });

  ipcMain.handle('print:directPrint', async (_e, { kind, data, options }) => {
    gateBatch(data);
    return renderer.directPrint({ kind, data, options });
  });

  ipcMain.handle('print:getTemplates', async () => {
    return renderer.templateManager.getTemplates();
  });

  ipcMain.handle('print:saveTemplate', async (_e, tplData) => {
    return renderer.templateManager.saveTemplate(tplData);
  });

  ipcMain.handle('print:deleteTemplate', async (_e, id) => {
    return renderer.templateManager.deleteTemplate(id);
  });

  ipcMain.handle('print:resetTemplates', async () => {
    return renderer.templateManager.resetTemplates();
  });

  ipcMain.handle('print:renderCustomTemplate', async (_e, { htmlContent, orderId, options = {} }) => {
    let order = null;
    if (orderId) {
      order = db.orders.getById(orderId);
    }
    return renderer.renderToHTML({
      kind: 'custom',
      data: { order },
      options: { ...options, customHTML: htmlContent }
    });
  });

  ipcMain.handle('print:listDocuments', async (_e, filters) => {
    return db.documents.list(filters);
  });

  ipcMain.handle('print:deleteDocument', async (_e, id) => {
    return db.documents.delete(id);
  });

  ipcMain.handle('print:clearAllDocuments', async (_e, kind) => {
    return db.documents.clearAll(kind);
  });

  ipcMain.handle('print:openPath', async (_e, filePath) => {
    if (filePath) {
      shell.openPath(filePath);
      return { success: true };
    }
    return { success: false };
  });
}

module.exports = { registerPrintIPC };
