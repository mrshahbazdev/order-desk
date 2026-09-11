const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { app } = require('electron');

const StoresRepo = require('./repos/stores.cjs');
const OrdersRepo = require('./repos/orders.cjs');
const ProductsRepo = require('./repos/products.cjs');
const SyncRepo = require('./repos/sync.cjs');
const OutboxRepo = require('./repos/outbox.cjs');
const DocumentsRepo = require('./repos/documents.cjs');
const SettingsRepo = require('./repos/settings.cjs');
const PackRepo = require('./repos/pack.cjs');
const CouriersRepo = require('./repos/couriers.cjs');
const ReturnsRepo = require('./repos/returns.cjs');
const PickingRepo = require('./repos/picking.cjs');
const ForecastingRepo = require('./repos/forecasting.cjs');
const StaffRepo = require('./repos/staff.cjs');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.stores = null;
    this.orders = null;
    this.products = null;
    this.sync = null;
    this.outbox = null;
    this.documents = null;
    this.settings = null;
    this.pack = null;
    this.couriers = null;
    this.returns = null;
    this.picking = null;
    this.forecasting = null;
    this.staff = null;
  }

  init(dbPath = null) {
    if (this.db) return this;

    if (!dbPath) {
      const userData = app ? app.getPath('userData') : process.cwd();
      dbPath = path.join(userData, 'orderdesk.db');
    }

    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    console.log('[DB] Connecting to SQLite:', dbPath);
    this.db = new Database(dbPath);

    // Set Pragmas as specified in architecture roadmap
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('busy_timeout = 5000');

    // Run Migrations
    this._runMigrations();

    // Initialize Repositories
    this.stores = new StoresRepo(this.db);
    this.orders = new OrdersRepo(this.db);
    this.products = new ProductsRepo(this.db);
    this.sync = new SyncRepo(this.db);
    this.outbox = new OutboxRepo(this.db);
    this.documents = new DocumentsRepo(this.db);
    this.settings = new SettingsRepo(this.db);
    this.pack = new PackRepo(this.db);
    this.couriers = new CouriersRepo(this.db);
    this.returns = new ReturnsRepo(this.db);
    this.picking = new PickingRepo(this.db);
    this.forecasting = new ForecastingRepo(this.db);
    this.staff = new StaffRepo(this.db);

    // Record initial installation metadata for v1/v2 lifecycle & grandfathering
    this._recordInstallMetadata();

    return this;
  }

  _recordInstallMetadata() {
    try {
      if (!this.settings.get('first_install_version')) {
        this.settings.set('first_install_version', '1.0.0');
      }
      if (!this.settings.get('first_install_date')) {
        this.settings.set('first_install_date', new Date().toISOString());
      }
    } catch (err) {
      console.error('[DB] Failed to record install metadata:', err.message);
    }
  }

  _runMigrations() {
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) return;

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const currentVersionRow = this.db.pragma('user_version', { simple: true });
    let currentVersion = currentVersionRow || 0;

    console.log(`[DB] Current schema user_version: ${currentVersion}`);

    for (let i = 0; i < files.length; i++) {
      const versionNum = i + 1;
      if (versionNum > currentVersion) {
        const filePath = path.join(migrationsDir, files[i]);
        const sql = fs.readFileSync(filePath, 'utf8');
        console.log(`[DB] Running migration ${files[i]} (v${versionNum})...`);

        this.db.transaction(() => {
          this.db.exec(sql);
          this.db.pragma(`user_version = ${versionNum}`);
        })();

        console.log(`[DB] Migration ${files[i]} applied successfully.`);
      }
    }
  }

  getSetting(key, defaultValue = null) {
    return this.settings ? this.settings.get(key, defaultValue) : defaultValue;
  }

  setSetting(key, value) {
    return this.settings ? this.settings.set(key, value) : value;
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

const dbManager = new DatabaseManager();
module.exports = dbManager;
