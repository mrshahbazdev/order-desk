const { BrowserWindow } = require('electron');

async function getAvailablePrinters() {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (!win) return [];
  try {
    const printers = await win.webContents.getPrintersAsync();
    return printers.map(p => ({
      name: p.name,
      displayName: p.displayName || p.name,
      description: p.description,
      isDefault: p.isDefault,
      status: p.status
    }));
  } catch (err) {
    console.error('[Printers] Failed to enumerate printers:', err);
    return [];
  }
}

module.exports = { getAvailablePrinters };
