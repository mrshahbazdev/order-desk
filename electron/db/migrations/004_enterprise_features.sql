-- Migration 004: Enterprise Features (Couriers, Reconciliations, Returns, Wave Picking, Locations, Purchase Orders, Staff)

CREATE TABLE IF NOT EXISTS couriers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'international', -- 'international', 'regional', 'domestic'
  country TEXT NOT NULL DEFAULT 'Global',
  tracking_url_template TEXT,
  api_endpoint TEXT,
  api_key TEXT,
  account_number TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shipments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER,
  courier_id INTEGER,
  tracking_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked', -- 'booked', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'
  carrier_name TEXT NOT NULL,
  service_type TEXT DEFAULT 'Standard Express',
  weight_kg REAL DEFAULT 0.5,
  cod_amount INTEGER DEFAULT 0, -- Minor units (cents/paisa)
  shipping_fee INTEGER DEFAULT 0,
  label_path TEXT,
  destination_city TEXT,
  destination_country TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  booked_at TEXT NOT NULL DEFAULT (datetime('now')),
  delivered_at TEXT,
  raw_response TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (courier_id) REFERENCES couriers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cod_reconciliations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  courier_id INTEGER,
  statement_ref TEXT UNIQUE NOT NULL,
  total_orders INTEGER NOT NULL DEFAULT 0,
  expected_amount INTEGER NOT NULL DEFAULT 0,
  received_amount INTEGER NOT NULL DEFAULT 0,
  courier_charges INTEGER NOT NULL DEFAULT 0,
  difference_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'settled', 'disputed'
  settlement_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (courier_id) REFERENCES couriers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER,
  order_number TEXT,
  tracking_number TEXT,
  variant_id INTEGER,
  item_title TEXT NOT NULL,
  variant_title TEXT,
  sku TEXT,
  qty INTEGER NOT NULL DEFAULT 1,
  reason TEXT NOT NULL, -- 'size_fit', 'wrong_item', 'defective', 'customer_refused', 'fake_address', 'other'
  condition_status TEXT NOT NULL DEFAULT 'resellable', -- 'resellable', 'damaged', 'inspecting'
  restocked INTEGER NOT NULL DEFAULT 1,
  customer_name TEXT,
  customer_phone TEXT,
  received_by TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS product_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  variant_id INTEGER UNIQUE NOT NULL,
  zone TEXT DEFAULT 'A',
  rack TEXT DEFAULT '01',
  shelf TEXT DEFAULT '1',
  bin TEXT DEFAULT 'B-01',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pick_waves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wave_number TEXT UNIQUE NOT NULL,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_items INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS pick_wave_orders (
  wave_id INTEGER NOT NULL,
  order_id INTEGER NOT NULL,
  PRIMARY KEY (wave_id, order_id),
  FOREIGN KEY (wave_id) REFERENCES pick_waves(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_number TEXT UNIQUE NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_email TEXT,
  supplier_phone TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'ordered', 'partially_received', 'received', 'cancelled'
  total_amount INTEGER NOT NULL DEFAULT 0,
  expected_delivery TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  received_at TEXT
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_id INTEGER NOT NULL,
  variant_id INTEGER,
  item_title TEXT NOT NULL,
  sku TEXT,
  qty_ordered INTEGER NOT NULL DEFAULT 1,
  qty_received INTEGER NOT NULL DEFAULT 0,
  unit_cost INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS staff_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Packer', -- 'Packer', 'Picker', 'Supervisor', 'Manager'
  employee_code TEXT UNIQUE NOT NULL,
  pin_code TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pack_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER,
  staff_id INTEGER,
  staff_name TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  items_packed INTEGER NOT NULL DEFAULT 1,
  package_weight_g INTEGER DEFAULT 0,
  verification_status TEXT NOT NULL DEFAULT 'verified', -- 'verified', 'manual_bypass', 'flagged'
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (staff_id) REFERENCES staff_members(id) ON DELETE SET NULL
);
