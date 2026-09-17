# Walkthrough — Skulane Advanced Build

We have built **Skulane**, a local-first desktop application for Windows using Electron, SQLite3, React, and MUI, according to the architectural roadmap.

---

## 1. Core Architecture & Modules Built

### A. Database Layer (`electron/db/`)
- **[001_init.sql](file:///c:/Users/user/Downloads/shopify%20window%20software/electron/db/migrations/001_init.sql)**: Complete SQLite migration tracking `stores`, `sync_state`, `orders` (with minor unit money integers), `order_items`, `products`, `variants`, `outbox`, `documents`, and `sync_logs`.
- **[index.cjs](file:///c:/Users/user/Downloads/shopify%20window%20software/electron/db/index.cjs)**: SQLite database manager initialized with WAL mode, normal synchronous, foreign keys enabled, busy timeout, and automated migration runner.
- **Repository Classes (`electron/db/repos/`)**:
  - `stores.cjs` — Multi-store connection states & metrics.
  - `orders.cjs` — High-performance multi-filtered listing, pagination, upsert transactions, dashboard metrics.
  - `products.cjs` — Product catalog and variant stock management.
  - `sync.cjs` — State tracking and sync audit logs.
  - `outbox.cjs` — Offline mutation queue with exponential backoff & jitter calculation.
  - `documents.cjs` — Generated document records & sequential gap-free invoice numbering (`INV-YYYY-XXXX`).
  - `settings.cjs` — App configuration store.

### B. Security & Licensing Layer (`electron/security/`)
- **[vault.cjs](file:///c:/Users/user/Downloads/shopify%20window%20software/electron/security/vault.cjs)**: Encrypted credential storage leveraging Electron's `safeStorage` (Windows DPAPI) with persistent encrypted vault in `userData`.
- **[license.cjs](file:///c:/Users/user/Downloads/shopify%20window%20software/electron/security/license.cjs)**: Ed25519 signature verification engine for offline license activation across Free, Pro, and Business tiers.

### C. Sync Engine & Store Integrations (`electron/sync/`)
- **Shopify Integration (`electron/sync/shopify/`)**:
  - `client.cjs` — GraphQL Admin API client pinned to **2026-01** with cost-aware leaky bucket throttle (`extensions.cost`).
  - `pull-orders.cjs` — Resumable cursor-based backfill and incremental pull with 5-minute clock skew overlap.
  - `pull-products.cjs` — Products & variants GraphQL sync.
  - `push.cjs` — Fulfillment mutations (`fulfillmentCreateV2`), tracking numbers, carrier, and note/tag updates.
- **WooCommerce Integration (`electron/sync/woo/`)**:
  - `client.cjs` — REST API v3 client with Basic auth, Link-header pagination, and rate limiter.
  - `pull-orders.cjs` & `pull-products.cjs` — Normalization into unified schema.
  - `push.cjs` — Status updates and customer notes.
- **Outbox Worker (`electron/sync/outbox.cjs`)**: Background processor for executing offline mutations with automatic retries.
- **Sync Engine (`electron/sync/engine.cjs`)**: Periodic scheduler (5m incremental, 15s outbox) with real-time event broadcasting.

### D. Native Printing Engine (`electron/print/`)
- **Templates (`electron/print/templates/`)**:
  - `invoices.cjs` — A4 and A5 pixel-perfect HTML/CSS invoices.
  - `packingSlips.cjs` — 100×150mm thermal and A4 packing slips grouped and sorted by SKU for warehouse picking.
  - `labels.cjs` — 4×6" thermal shipping labels with barcodes.
  - `barcodes.cjs` — 50×25mm product barcode labels.
- **Renderer (`render.cjs`)**: Hidden `BrowserWindow` renderer supporting direct silent printing and PDF export.

### E. Frontend UI (`src/`)
- **[App.jsx](file:///c:/Users/user/Downloads/shopify%20window%20software/src/App.jsx)**: Main layout with dark sidebar, live online/offline network indicator, and active badge counts.
- **[Dashboard.jsx](file:///c:/Users/user/Downloads/shopify%20window%20software/src/pages/Dashboard.jsx)**: Real-time revenue, total orders, unfulfilled count, store summaries, and quick batch print.
- **[Orders.jsx](file:///c:/Users/user/Downloads/shopify%20window%20software/src/pages/Orders.jsx)**: High-performance orders manager with multi-filter, instant search, batch printing, and inline fulfillment & tracking.
- **[Stores.jsx](file:///c:/Users/user/Downloads/shopify%20window%20software/src/pages/Stores.jsx)**: Multi-channel manager with connection test dialogs for Shopify GraphQL and WooCommerce REST.
- **[Products.jsx](file:///c:/Users/user/Downloads/shopify%20window%20software/src/pages/Products.jsx)**: Catalog viewer, stock level modifier, and barcode printing.
- **[PrintCenter.jsx](file:///c:/Users/user/Downloads/shopify%20window%20software/src/pages/PrintCenter.jsx)**: Live document studio with iframe preview and document history archive.
- **[SyncHealth.jsx](file:///c:/Users/user/Downloads/shopify%20window%20software/src/pages/SyncHealth.jsx)**: Real-time sync log inspector and outbox mutation queue manager.
- **[Reports.jsx](file:///c:/Users/user/Downloads/shopify%20window%20software/src/pages/Reports.jsx)**: Channel analytics and CSV export.
- **[Settings.jsx](file:///c:/Users/user/Downloads/shopify%20window%20software/src/pages/Settings.jsx)**: Merchant preferences, invoice numbering rules, and license activation.

---

## 2. How to Run & Test

1. Run the development server:
   ```powershell
   npm install
   npm run dev
   ```
2. In the app:
   - Go to **Stores & Channels** → click **Connect Store** to add your Shopify or WooCommerce store credentials.
   - Click **Sync All Stores** to pull orders and products into SQLite.
   - Go to **Orders** to select multiple orders and click **Batch 4x6" / Thermal Slips** to test batch printing!
