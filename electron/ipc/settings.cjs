const { ipcMain, app } = require('electron');

function registerSettingsIPC(db) {
  ipcMain.handle('settings:getAll', async () => {
    return db.settings.getAll();
  });

  ipcMain.handle('settings:get', async (_e, key, defaultValue) => {
    return db.settings.get(key, defaultValue);
  });

  ipcMain.handle('settings:set', async (_e, key, value) => {
    return db.settings.set(key, value);
  });

  ipcMain.handle('settings:getAppInfo', async () => {
    return {
      version: app ? app.getVersion() : '1.0.0',
      userDataPath: app ? app.getPath('userData') : process.cwd(),
      platform: process.platform,
      arch: process.arch
    };
  });
}

module.exports = { registerSettingsIPC };
