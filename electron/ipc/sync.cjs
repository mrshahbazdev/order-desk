const { ipcMain } = require('electron');

function registerSyncIPC(db, syncEngine) {
  ipcMain.handle('sync:triggerStore', async (_e, storeId) => {
    if (!syncEngine) throw new Error('Sync engine not initialized');
    return syncEngine.syncStore(storeId);
  });

  ipcMain.handle('sync:triggerAll', async () => {
    if (!syncEngine) throw new Error('Sync engine not initialized');
    return syncEngine.syncAllActiveStores({ isBackground: false });
  });

  ipcMain.handle('sync:getLogs', async (_e, limit) => {
    return db.sync.getRecentLogs(limit || 100);
  });

  ipcMain.handle('sync:clearLogs', async () => {
    return db.sync.clearLogs();
  });

  ipcMain.handle('sync:getOutboxJobs', async (_e, filters) => {
    return db.outbox.listAll(filters);
  });

  ipcMain.handle('sync:getOutboxStats', async () => {
    return db.outbox.getStats();
  });

  ipcMain.handle('sync:retryOutboxJob', async (_e, id) => {
    db.outbox.retryJob(id);
    if (syncEngine && syncEngine.outboxWorker) {
      syncEngine.outboxWorker.processQueue();
    }
    return { success: true };
  });

  ipcMain.handle('sync:deleteOutboxJob', async (_e, id) => {
    return db.outbox.deleteJob(id);
  });

  ipcMain.handle('sync:flushOutbox', async () => {
    if (syncEngine && syncEngine.outboxWorker) {
      await syncEngine.outboxWorker.processQueue();
    }
    return db.outbox.getStats();
  });

  ipcMain.handle('sync:retryAllFailed', async () => {
    db.db.prepare("UPDATE outbox SET status = 'pending', attempts = 0, next_try_at = datetime('now'), error = NULL WHERE status = 'failed'").run();
    if (syncEngine && syncEngine.outboxWorker) {
      syncEngine.outboxWorker.processQueue();
    }
    return db.outbox.getStats();
  });
}

module.exports = { registerSyncIPC };
