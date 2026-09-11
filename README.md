# Order Desk

Local-first desktop application for high-volume multi-channel e-commerce operations, built for Shopify and WooCommerce merchants.

Developed by **Muhammad Shahbaz**

---

## Features

- **Multi-Store Synchronization**: Seamless synchronization with Shopify and WooCommerce stores.
- **Orders & Fulfillment**: Centralized dispatch queue, live status filtering, and bulk processing.
- **Warehouse Wave Picking**: Batch pick-list generation and aisle/rack bin location routing.
- **Packing Station**: Barcode scan verification with audio-visual cues and pack duration logging.
- **Print Center**: High-speed printing for invoices, packing slips, 4x6 thermal shipping labels, and EAN-13 barcodes.
- **Logistics & Dispatch**: Multi-carrier tracking integration (DHL, FedEx, UPS, USPS, Royal Mail, TCS, Leopard, Trax, PostEx, M&P, CallCourier) with encrypted OS vault credential storage.
- **Returns & Exchanges**: RMA tracking, restock workflows, and automated discrepancy logging.
- **Inventory & Demand Forecasting**: Reorder point recommendations, stockout risk alerts, and supplier purchase orders.
- **Staff Performance Analytics**: Operator packing velocity, accuracy rates, and operational throughput metrics.
- **Offline-First Resilience**: Full local SQLite WAL storage with automatic sync queue reconciliation.

---

## Tech Stack

- **Runtime**: Electron
- **Frontend**: React 18, Vite, Material UI (@mui/material)
- **Database**: SQLite with `better-sqlite3` (WAL mode enabled)
- **Security**: DPAPI / SafeStorage hardware encryption for carrier and store credentials
- **Licensing**: Offline Ed25519 asymmetric signature verification

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Installation
```bash
# Clone repository
git clone https://github.com/mrshahbazdev/order-desk.git
cd order-desk

# Install dependencies
npm install
```

### Development
```bash
# Run both Vite frontend and Electron main process in hot-reload development mode
npm run dev
```

### Build & Package
```bash
# Build frontend
npm run build

# Package desktop application for Windows
npm run dist:win
```

---

## Privacy & Security

Order Desk is local-first. All store data, orders, customer records, and credentials remain on the local machine within the operating system sandbox. No telemetry or analytics are collected.

---

## Contact & Support

- **Developer**: Muhammad Shahbaz
- **Email**: mrshahbaznns@gmail.com / mrshahbaz46@gamil.com
- **WhatsApp**: +92 306 1081842

