-- 001_init.sql: Order Desk Core Schema

-- Stores configuration
CREATE TABLE IF NOT EXISTS stores (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  platform      TEXT NOT NULL,          -- 'shopify' | 'woo'
  label         TEXT NOT NULL,
  domain        TEXT NOT NULL UNIQUE,
  currency      TEXT DEFAULT 'PKR',
  timezone      TEXT DEFAULT 'UTC',
  credential_id TEXT NOT NULL,          -- key into encrypted vault, NOT raw token
  status        TEXT DEFAULT 'active',  -- active | auth_failed | disabled
  created_at    TEXT DEFAULT (datetime('now'))
);

-- Sync state per resource per store
CREATE TABLE IF NOT EXISTS sync_state (
  store_id      INTEGER NOT NULL,
  resource      TEXT NOT NULL,          -- orders | products | customers
  cursor        TEXT,                   -- GraphQL endCursor or pagination cursor
  watermark     TEXT,                   -- max updated_at seen
  last_run_at   TEXT,
  last_error    TEXT,
  backfill_done INTEGER DEFAULT 0,
  PRIMARY KEY (store_id, resource),
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- Unified orders table (Minor units for money, raw payload stored for backfills)
CREATE TABLE IF NOT EXISTS orders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id       INTEGER NOT NULL,
  remote_id      TEXT NOT NULL,
  name           TEXT,                  -- #1001 or order number string
  number         INTEGER,
  email          TEXT,
  phone          TEXT,
  financial      TEXT,                  -- paid | pending | refunded | partially_paid | voided
  fulfillment    TEXT,                  -- unfulfilled | partial | fulfilled | restocked
  currency       TEXT DEFAULT 'PKR',
  subtotal       INTEGER DEFAULT 0,     -- Minor units (e.g. 129900 = 1299.00)
  shipping       INTEGER DEFAULT 0,
  tax            INTEGER DEFAULT 0,
  discount       INTEGER DEFAULT 0,
  total          INTEGER DEFAULT 0,
  customer_json  TEXT,
  ship_json      TEXT,
  bill_json      TEXT,
  tags           TEXT,
  note           TEXT,
  placed_at      TEXT,
  updated_at     TEXT,
  raw            TEXT,                  -- full JSON payload
  UNIQUE (store_id, remote_id),
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_orders_placed  ON orders(store_id, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_fulfil  ON orders(store_id, fulfillment, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_updated ON orders(store_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_orders_name    ON orders(name);

-- Line items per order
CREATE TABLE IF NOT EXISTS order_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  remote_id   TEXT,
  sku         TEXT,
  title       TEXT,
  variant     TEXT,
  qty         INTEGER DEFAULT 1,
  price       INTEGER DEFAULT 0,
  total       INTEGER DEFAULT 0,
  tax         INTEGER DEFAULT 0,
  image_url   TEXT
);

CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_items_sku   ON order_items(sku);

-- Products catalog
CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id    INTEGER NOT NULL,
  remote_id   TEXT NOT NULL,
  title       TEXT,
  vendor      TEXT,
  type        TEXT,
  status      TEXT DEFAULT 'active',
  tags        TEXT,
  image_url   TEXT,
  updated_at  TEXT,
  raw         TEXT,
  UNIQUE (store_id, remote_id),
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id, updated_at DESC);

-- Product variants
CREATE TABLE IF NOT EXISTS variants (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  remote_id   TEXT,
  sku         TEXT,
  barcode     TEXT,
  title       TEXT,
  price       INTEGER DEFAULT 0,
  compare_at  INTEGER DEFAULT 0,
  cost        INTEGER DEFAULT 0,
  stock       INTEGER DEFAULT 0,
  weight_g    INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_variants_sku ON variants(sku);
CREATE INDEX IF NOT EXISTS idx_variants_product ON variants(product_id);

-- Outbox for offline local writes queued to push to remote store APIs
CREATE TABLE IF NOT EXISTS outbox (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id    INTEGER NOT NULL,
  kind        TEXT NOT NULL,     -- fulfill_order | update_variant | add_tag | update_note
  payload     TEXT NOT NULL,
  attempts    INTEGER DEFAULT 0,
  next_try_at TEXT,
  status      TEXT DEFAULT 'pending', -- pending | processing | done | failed
  error       TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_outbox_ready ON outbox(status, next_try_at);

-- Generated documents archive
CREATE TABLE IF NOT EXISTS documents (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id   INTEGER,
  order_id   INTEGER,
  kind       TEXT,               -- invoice | packing_slip | label | barcode
  number     TEXT,               -- invoice sequence number e.g. INV-2026-0001
  path       TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_order ON documents(order_id);

-- Key-value settings
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- Sync logs for monitoring sync health
CREATE TABLE IF NOT EXISTS sync_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id    INTEGER,
  resource    TEXT,
  type        TEXT,              -- backfill | incremental | push | error
  message     TEXT,
  details     TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sync_logs_store ON sync_logs(store_id, created_at DESC);
