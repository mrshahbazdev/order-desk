-- Pack Station: scan-verified packing sessions.
-- Keeps an auditable record of who packed what and when, which is the thing
-- merchants reach for when a customer claims an item was missing.

CREATE TABLE IF NOT EXISTS pack_sessions (
  id           INTEGER PRIMARY KEY,
  order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_id     INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'open',   -- open | packed | abandoned
  packer       TEXT,
  started_at   TEXT DEFAULT (datetime('now')),
  finished_at  TEXT,
  duration_ms  INTEGER,
  notes        TEXT
);
CREATE INDEX IF NOT EXISTS idx_pack_order  ON pack_sessions(order_id);
CREATE INDEX IF NOT EXISTS idx_pack_status ON pack_sessions(status, started_at DESC);

CREATE TABLE IF NOT EXISTS pack_scans (
  id            INTEGER PRIMARY KEY,
  session_id    INTEGER NOT NULL REFERENCES pack_sessions(id) ON DELETE CASCADE,
  order_item_id INTEGER,
  code          TEXT NOT NULL,
  result        TEXT NOT NULL,   -- matched | unexpected | overscan | duplicate
  scanned_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_scans_session ON pack_scans(session_id);

-- Scanning a barcode has to hit an index or the station feels sluggish
-- the moment the catalogue passes a few thousand variants.
CREATE INDEX IF NOT EXISTS idx_variants_barcode ON variants(barcode);
CREATE INDEX IF NOT EXISTS idx_orders_name      ON orders(name);
