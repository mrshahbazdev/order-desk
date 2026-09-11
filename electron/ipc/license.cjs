const { ipcMain } = require('electron');
const LicenseManager = require('../security/license.cjs');

function registerLicenseIPC(db) {
  const licenseManager = new LicenseManager(db);

  ipcMain.handle('license:get', async () => {
    return licenseManager.getCurrentLicense();
  });

  ipcMain.handle('license:activate', async (_e, licenseKey) => {
    return licenseManager.setLicense(licenseKey);
  });

  ipcMain.handle('license:deactivate', async () => {
    return licenseManager.removeLicense();
  });
}

module.exports = { registerLicenseIPC };
