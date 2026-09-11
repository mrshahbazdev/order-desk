const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app, safeStorage } = require('electron');

/**
 * Encrypted credential store.
 *
 * The previous version fell back to writing the vault as plain JSON when
 * safeStorage was unavailable — which meant Shopify access tokens and
 * WooCommerce consumer secrets sat in cleartext on disk, and got swept up
 * into any backup or support-log zip. That fallback is gone. If the OS
 * can't encrypt, we refuse to store and say so.
 */
class Vault {
  constructor() {
    this.vaultPath = null;
    this._cache = null;
  }

  getVaultPath() {
    if (!this.vaultPath) {
      const userData = app ? app.getPath('userData') : process.cwd();
      this.vaultPath = path.join(userData, 'orderdesk_vault.enc');
    }
    return this.vaultPath;
  }

  isAvailable() {
    return !!(safeStorage && safeStorage.isEncryptionAvailable());
  }

  _assertAvailable() {
    if (this.isAvailable()) return;
    throw new Error(
      'Secure storage is unavailable on this system, so store credentials ' +
      'cannot be saved. On Windows this usually means the DPAPI service is ' +
      'blocked by policy. Order Desk will not fall back to storing tokens ' +
      'unencrypted.'
    );
  }

  _readAll() {
    if (this._cache) return this._cache;

    const filePath = this.getVaultPath();
    if (!fs.existsSync(filePath)) {
      this._cache = {};
      return this._cache;
    }

    this._assertAvailable();

    try {
      const raw = fs.readFileSync(filePath);
      if (!raw || raw.length === 0) {
        this._cache = {};
        return this._cache;
      }
      this._cache = JSON.parse(safeStorage.decryptString(raw));
      return this._cache;
    } catch (err) {
      // A vault that won't decrypt is almost always a different Windows user
      // profile or a restored-from-backup machine. Silently starting fresh
      // would look like "all my stores disappeared", so be explicit.
      const backup = `${filePath}.unreadable.${Date.now()}`;
      try { fs.renameSync(filePath, backup); } catch { /* best effort */ }
      this._cache = {};
      const e = new Error(
        'The credential vault could not be decrypted on this machine. ' +
        `The old file was kept at ${backup}. You will need to reconnect your stores.`
      );
      e.vaultReset = true;
      throw e;
    }
  }

  _writeAll(data) {
    this._assertAvailable();

    const filePath = this.getVaultPath();
    const tmpPath = `${filePath}.tmp`;
    const encrypted = safeStorage.encryptString(JSON.stringify(data));

    // Atomic write: a crash mid-write must not leave a truncated vault.
    fs.writeFileSync(tmpPath, encrypted, { mode: 0o600 });
    fs.renameSync(tmpPath, filePath);

    try { fs.chmodSync(filePath, 0o600); } catch { /* windows */ }
    this._cache = data;
  }

  setSecret(id, secretObj) {
    if (!id) throw new Error('Secret ID is required');
    const all = this._readAll();
    all[id] = { ...secretObj, updated_at: new Date().toISOString() };
    this._writeAll(all);
    return id;
  }

  getSecret(id) {
    if (!id) return null;
    return this._readAll()[id] || null;
  }

  deleteSecret(id) {
    if (!id) return;
    const all = this._readAll();
    if (all[id]) {
      delete all[id];
      this._writeAll(all);
    }
  }

  /** Wipe everything — used by Settings → "Delete my data". */
  destroy() {
    const filePath = this.getVaultPath();
    try { fs.unlinkSync(filePath); } catch { /* nothing to remove */ }
    this._cache = {};
  }

  generateSecretId() {
    return 'sec_' + crypto.randomBytes(12).toString('hex');
  }
}

module.exports = new Vault();
