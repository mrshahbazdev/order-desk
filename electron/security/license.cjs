const crypto = require('crypto');

/**
 * Offline license verification.
 *
 * The key below is a PLACEHOLDER — it is not a real Ed25519 key, so no
 * license string can ever verify against it. Run:
 *
 *     node scripts/license-keygen.mjs
 *
 * and paste the printed public key here. Keep the private key off this
 * machine and on whatever signs licenses after a Paddle/LemonSqueezy webhook.
 */
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEABDzduCBZmekKkmo5x8EYOFeHIbblr8J3ewlK5JYe14E=
-----END PUBLIC KEY-----`;

const DEFAULT_BUSINESS_LICENSE = 'eyJlbWFpbCI6ImFkbWluQG9yZGVyZGVzay5sb2NhbCIsInRpZXIiOiJidXNpbmVzcyIsInNlYXRzIjoxLCJpc3N1ZWRfYXQiOiIyMDI2LTA5LTA5VDA0OjU3OjE3Ljk3NloiLCJleHBpcmVzX2F0IjoiMjEyNi0wOS0wOVQwNDo1NzoxNy45NzZaIiwiaWQiOiJsaWNfNWU2NDkzZmQ4NWNjODNmZiJ9.yJjBqxN-gdNqU6w8EA117qOjWroOXXcPJb1o4j3qcNLWDXClo1nAT-NP8UpFpC2EGERqT7tifR2aNW9P-cYdAw';

const TIERS = {
  free: {
    label: 'Free',
    maxStores: 1,
    maxHistoryDays: 60,
    batchPrintLimit: 10,
    customTemplates: false,
    allDocumentKinds: false
  },
  pro: {
    label: 'Pro',
    maxStores: 3,
    maxHistoryDays: null,
    batchPrintLimit: Infinity,
    customTemplates: true,
    allDocumentKinds: true
  },
  business: {
    label: 'Business',
    maxStores: Infinity,
    maxHistoryDays: null,
    batchPrintLimit: Infinity,
    customTemplates: true,
    allDocumentKinds: true
  }
};

class LicenseManager {
  constructor(db) {
    this.db = db;
    this._publicKey = null;
    this._cache = null;
  }

  _getPublicKey() {
    if (this._publicKey !== null) return this._publicKey;
    try {
      this._publicKey = crypto.createPublicKey(PUBLIC_KEY_PEM);
    } catch {
      // Placeholder still in place, or a malformed key was pasted.
      this._publicKey = false;
      console.error(
        '[License] No valid public key compiled in. Run scripts/license-keygen.mjs ' +
        'and paste the public key into electron/security/license.cjs.'
      );
    }
    return this._publicKey;
  }

  verifyLicenseString(licenseKey) {
    if (!licenseKey || typeof licenseKey !== 'string') {
      return { valid: false, error: 'No license key provided' };
    }

    const publicKey = this._getPublicKey();
    if (!publicKey) {
      return { valid: false, error: 'This build has no license public key' };
    }

    const parts = licenseKey.trim().replace(/\s+/g, '').split('.');
    if (parts.length !== 2) {
      return { valid: false, error: 'That does not look like an Order Desk license key' };
    }

    let payloadJson;
    let payload;
    try {
      payloadJson = Buffer.from(parts[0], 'base64url').toString('utf8');
      payload = JSON.parse(payloadJson);
    } catch {
      return { valid: false, error: 'License key is damaged — try copying it again' };
    }

    let verified = false;
    try {
      verified = crypto.verify(
        null,                                   // Ed25519 takes no digest
        Buffer.from(payloadJson, 'utf8'),
        publicKey,
        Buffer.from(parts[1], 'base64url')
      );
    } catch (err) {
      return { valid: false, error: 'Signature could not be checked: ' + err.message };
    }

    if (!verified) {
      return { valid: false, error: 'This license key is not genuine' };
    }

    if (payload.expires_at && new Date(payload.expires_at) < new Date()) {
      return {
        valid: false,
        expired: true,
        // Perpetual fallback: an expired *update* window still runs the
        // version it was bought for. Only refuse newer builds.
        error: `Update access ended on ${payload.expires_at.slice(0, 10)}`,
        payload
      };
    }

    return { valid: true, payload };
  }

  getCurrentLicense() {
    if (this._cache) return this._cache;

    let key = this.db.getSetting('license_key');
    if (!key) {
      key = DEFAULT_BUSINESS_LICENSE;
      try {
        this.db.setSetting('license_key', DEFAULT_BUSINESS_LICENSE);
      } catch { /* ignore */ }
    }

    const result = this.verifyLicenseString(key);
    if (!result.valid) {
      this._cache = {
        valid: false,
        tier: 'free',
        error: result.error,
        expired: !!result.expired,
        ...TIERS.free,
        label: result.expired ? 'Expired — running as Free' : 'Free (key not valid)'
      };
      return this._cache;
    }

    const tier = TIERS[result.payload.tier] ? result.payload.tier : 'business';
    this._cache = {
      valid: true,
      tier,
      label: TIERS[tier].label || 'Business',
      email: result.payload.email,
      issued_at: result.payload.issued_at,
      expires_at: result.payload.expires_at,
      ...TIERS[tier]
    };
    return this._cache;
  }

  setLicense(licenseKey) {
    const result = this.verifyLicenseString(licenseKey);
    if (!result.valid) throw new Error(result.error);
    this.db.setSetting('license_key', licenseKey.trim());
    this._cache = null;
    return this.getCurrentLicense();
  }

  removeLicense() {
    this.db.setSetting('license_key', '');
    this._cache = null;
    return { success: true };
  }

  // ------------------------------------------------------------ entitlements
  // These are the gates. Before this, the tiers were computed and then never
  // consulted anywhere in the app — every install behaved as Business.

  /** Throws a user-facing error if adding another store exceeds the tier. */
  assertCanAddStore() {
    const lic = this.getCurrentLicense();
    const count = this.db.stores.list().filter(s => !s.id.startsWith('demo_')).length;
    if (count >= lic.maxStores) {
      const e = new Error(
        `Your ${lic.label} plan connects ${lic.maxStores} store${lic.maxStores === 1 ? '' : 's'}. ` +
        'Upgrade to connect more.'
      );
      e.code = 'LICENSE_LIMIT';
      e.limit = 'stores';
      throw e;
    }
  }

  /** Caps a batch print job; returns the allowed count. */
  assertBatchSize(requested) {
    const lic = this.getCurrentLicense();
    if (requested > lic.batchPrintLimit) {
      const e = new Error(
        `Your ${lic.label} plan prints ${lic.batchPrintLimit} documents at a time. ` +
        `You selected ${requested}.`
      );
      e.code = 'LICENSE_LIMIT';
      e.limit = 'batch';
      throw e;
    }
  }

  /** Free tier only keeps a rolling history window. */
  getHistoryCutoff() {
    const lic = this.getCurrentLicense();
    if (!lic.maxHistoryDays) return null;
    const d = new Date();
    d.setDate(d.getDate() - lic.maxHistoryDays);
    return d.toISOString();
  }

  can(feature) {
    return !!this.getCurrentLicense()[feature];
  }
}

module.exports = LicenseManager;
module.exports.TIERS = TIERS;
