const { ipcMain } = require('electron');
const { isDemoLoaded, loadDemoData, clearDemoData } = require('../db/seed/demo.cjs');

function registerDemoIPC(dbManager) {
  ipcMain.handle('demo:status', async () => {
    try {
      const active = isDemoLoaded(dbManager);
      return { isDemoLoaded: active };
    } catch (err) {
      console.error('Failed to get demo status:', err);
      return { isDemoLoaded: false, error: err.message };
    }
  });

  ipcMain.handle('demo:load', async () => {
    try {
      const result = loadDemoData(dbManager);
      return result;
    } catch (err) {
      console.error('Failed to load demo data:', err);
      throw err;
    }
  });

  ipcMain.handle('demo:clear', async () => {
    try {
      const result = clearDemoData(dbManager);
      return result;
    } catch (err) {
      console.error('Failed to clear demo data:', err);
      throw err;
    }
  });
}

module.exports = { registerDemoIPC };
