const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, session, ipcMain, shell, dialog } = require('electron');

const dbManager = require('./db/index.cjs');
const SyncEngine = require('./sync/engine.cjs');
const { registerStoresIPC } = require('./ipc/stores.cjs');
const { registerOrdersIPC } = require('./ipc/orders.cjs');
const { registerProductsIPC } = require('./ipc/products.cjs');
const { registerPrintIPC } = require('./ipc/print.cjs');
const { registerSyncIPC } = require('./ipc/sync.cjs');
const { registerSettingsIPC } = require('./ipc/settings.cjs');
const { registerLicenseIPC } = require('./ipc/license.cjs');
const { registerPackIPC } = require('./ipc/pack.cjs');
const { registerLogisticsIPC } = require('./ipc/logistics.cjs');
const { registerDemoIPC } = require('./ipc/demo.cjs');

let mainWindow = null;
let syncEngine = null;
let pendingDeepLink = null;   // arrives before the window exists on cold start

const isDev = !app.isPackaged;

// --------------------------------------------------------------- single instance

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  registerProtocolClient();

  app.on('second-instance', (_event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const link = commandLine.find((arg) => arg.startsWith('skulane://') || arg.startsWith('orderdesk://'));
    if (link) handleDeepLink(link);
  });

  // macOS
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });

  /**
   * COLD START, Windows: if the app was not already running, Windows launches
   * it with the URL as an argv entry and `second-instance` never fires. The
   * previous version only listened for second-instance, so the very first
   * OAuth connect — the one every new customer does — was dropped on the floor.
   */
  const argvLink = process.argv.find((arg) => arg.startsWith('skulane://') || arg.startsWith('orderdesk://'));
  if (argvLink) pendingDeepLink = argvLink;

  app.whenReady().then(initApp);
}

function registerProtocolClient() {
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('skulane', process.execPath, [
      path.resolve(process.argv[1])
    ]);
  } else {
    app.setAsDefaultProtocolClient('skulane');
  }
}

function handleDeepLink(urlStr) {
  try {
    const url = new URL(urlStr);
    const host = url.hostname || url.pathname.replace(/^\/+/, '');
    if (host !== 'connected') return;

    const payload = {
      ticket: url.searchParams.get('ticket'),
      shop: url.searchParams.get('shop'),
      state: url.searchParams.get('state')
    };

    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send('oauth:connected', payload);
    } else {
      pendingDeepLink = urlStr;   // replay once the window is up
    }
  } catch (err) {
    console.error('[App] Bad deep link:', urlStr, err.message);
  }
}

// ------------------------------------------------------------- window geometry

function windowStatePath() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadWindowState() {
  const fallback = { width: 1360, height: 860 };
  try {
    const s = JSON.parse(fs.readFileSync(windowStatePath(), 'utf8'));
    if (!s.width || !s.height) return fallback;

    // Drop coordinates that landed off-screen (unplugged second monitor).
    const { screen } = require('electron');
    const displays = screen.getAllDisplays();
    const visible =
      s.x === undefined ||
      displays.some(
        (d) =>
          s.x >= d.bounds.x - 50 &&
          s.y >= d.bounds.y - 50 &&
          s.x < d.bounds.x + d.bounds.width &&
          s.y < d.bounds.y + d.bounds.height
      );

    return visible ? s : { width: s.width, height: s.height };
  } catch {
    return fallback;
  }
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    const bounds = mainWindow.isMaximized()
      ? mainWindow.getNormalBounds()
      : mainWindow.getBounds();
    fs.writeFileSync(
      windowStatePath(),
      JSON.stringify({ ...bounds, maximized: mainWindow.isMaximized() })
    );
  } catch { /* not worth bothering the user about */ }
}

// ----------------------------------------------------------------------- boot

async function initApp() {
  applyContentSecurityPolicy();

  try {
    dbManager.init();
  } catch (err) {
    dialog.showErrorBox(
      'Skulane could not start',
      'The local database could not be opened.\n\n' + err.message +
      '\n\nIf this keeps happening, another copy of Skulane may still be running.'
    );
    app.quit();
    return;
  }

  syncEngine = new SyncEngine(dbManager, broadcastToRenderer);
  syncEngine.start();

  registerStoresIPC(dbManager, syncEngine);
  registerOrdersIPC(dbManager, syncEngine);
  registerProductsIPC(dbManager, syncEngine);
  registerPrintIPC(dbManager);
  registerSyncIPC(dbManager, syncEngine);
  registerSettingsIPC(dbManager);
  registerLicenseIPC(dbManager);
  registerPackIPC(dbManager, syncEngine);
  registerLogisticsIPC(dbManager);
  registerDemoIPC(dbManager);
  registerAppIPC();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}

function applyContentSecurityPolicy() {
  // Relaxed for local packaged desktop execution
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
}

function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    ...state,
    minWidth: 1024,
    minHeight: 700,
    show: true,
    title: 'Skulane',
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
      spellcheck: false
    }
  });

  if (state.maximized) mainWindow.maximize();

  mainWindow.show();
  mainWindow.focus();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    if (pendingDeepLink) {
      handleDeepLink(pendingDeepLink);
      pendingDeepLink = null;
    }
  });

  const distHtml = path.join(__dirname, '..', 'dist', 'index.html');
  if (process.env.VITE_DEV === 'true') {
    mainWindow.loadURL('http://localhost:5173');
  } else if (fs.existsSync(distHtml)) {
    mainWindow.loadFile(distHtml);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  // Renderer must never navigate away from the app.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = url.startsWith('http://localhost:5173') || url.startsWith('file://');
    if (!allowed) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('[App] Renderer gone:', details.reason);
    if (details.reason !== 'clean-exit') {
      dialog.showErrorBox('Skulane stopped responding', 'The window will reload.');
      mainWindow.reload();
    }
  });

  let saveTimer = null;
  const queueSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveWindowState, 400);
  };
  mainWindow.on('resize', queueSave);
  mainWindow.on('move', queueSave);

  mainWindow.on('close', saveWindowState);
  mainWindow.on('closed', () => { mainWindow = null; });
}

function broadcastToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    mainWindow.webContents.send(channel, payload);
  }
}

/** Diagnostics + data deletion — both come up constantly in support. */
function registerAppIPC() {
  ipcMain.handle('app:getDiagnostics', () => {
    const stores = dbManager.stores.list();
    return {
      version: app.getVersion(),
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
      platform: `${process.platform} ${process.arch}`,
      packaged: app.isPackaged,
      windowsStore: !!process.windowsStore,
      userDataPath: app.getPath('userData'),
      // never include domains or tokens in something the user will paste publicly
      stores: stores.map((s) => ({ platform: s.platform, status: s.status })),
      recentErrors: dbManager.sync.getRecentLogs(20).filter((l) => l.type === 'error')
    };
  });

  ipcMain.handle('app:openUserData', () => shell.openPath(app.getPath('userData')));

  ipcMain.handle('app:deleteAllData', async () => {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['Delete everything', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      title: 'Delete all local data',
      message: 'Delete all Skulane data on this computer?',
      detail:
        'This removes the local database, saved credentials and generated documents. ' +
        'Your stores are not affected — nothing is deleted from Shopify or WooCommerce.'
    });
    if (response !== 0) return { cancelled: true };

    if (syncEngine) syncEngine.stop();
    dbManager.close();
    require('./security/vault.cjs').destroy();

    const userData = app.getPath('userData');
    for (const f of ['orderdesk.db', 'orderdesk.db-wal', 'orderdesk.db-shm', 'window-state.json']) {
      try { fs.unlinkSync(path.join(userData, f)); } catch { /* may not exist */ }
    }
    try { fs.rmSync(path.join(userData, 'documents'), { recursive: true, force: true }); } catch { /* ignore */ }

    app.relaunch();
    app.exit(0);
    return { success: true };
  });
}

// ------------------------------------------------------------------- shutdown

app.on('before-quit', () => {
  saveWindowState();
  if (syncEngine) syncEngine.stop();
  try { dbManager.close(); } catch { /* already closed */ }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
