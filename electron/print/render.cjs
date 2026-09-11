const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { BrowserWindow, app } = require('electron');
const { renderInvoiceHTML } = require('./templates/invoices.cjs');
const { renderPackingSlipHTML } = require('./templates/packingSlips.cjs');
const { renderShippingLabelHTML } = require('./templates/labels.cjs');
const { renderBarcodeLabelHTML } = require('./templates/barcodes.cjs');
const CustomTemplateManager = require('./custom-templates.cjs');

/**
 * Page geometry per document kind.
 * `preferCSSPageSize` lets the template's own `@page { size: ... }` win,
 * which is what actually makes thermal sizes come out right.
 */
const PAGE_PRESETS = {
  a4: { pageSize: 'A4' },
  a5: { pageSize: 'A5' },
  label_4x6: { pageSize: { width: 4, height: 6 } },        // inches
  '4x6': { pageSize: { width: 4, height: 6 } },
  '80mm': { pageSize: { width: 3.15, height: 7.87 } },
  '50x25': { pageSize: { width: 1.97, height: 0.98 } },
  thermal_100x150: { pageSize: { width: 3.94, height: 5.91 } },
  barcode_50x25: { pageSize: { width: 1.97, height: 0.98 } }
};

class PrintRenderer {
  constructor(db) {
    this.db = db;
    this.templateManager = new CustomTemplateManager(db);
    this._tempFiles = new Set();
  }

  getDocDir() {
    const userData = app ? app.getPath('userData') : process.cwd();
    const docDir = path.join(userData, 'documents');
    fs.mkdirSync(docDir, { recursive: true });
    return docDir;
  }

  // ---------------------------------------------------------------- templates

  async renderToHTML({ kind, data = {}, options = {} }) {
    const sampleOrder = {
      id: 0,
      name: '#SAMPLE-1001',
      customer: { name: 'Ahmed Khan', firstName: 'Ahmed', lastName: 'Khan', email: 'customer@example.com', phone: '+92 300 1234567' },
      shipping_address: {
        name: 'Ahmed Khan',
        address1: 'House 123, Street 4, Sector F-8/2',
        address2: 'Near Commercial Market',
        city: 'Islamabad',
        province: 'Federal',
        zip: '44000',
        country: 'Pakistan',
        phone: '+92 300 1234567'
      },
      items: [
        { title: 'Air Running Athletic Shoes (Black / 42)', sku: 'SHOE-AIR-BLK-42', qty: 1, price: 450000, total: 450000, variant: 'Size: 42, Color: Black' },
        { title: 'Cotton Crew Sports Socks', sku: 'SOCK-CREW-WHT', qty: 2, price: 50000, total: 100000, variant: 'Pack of 2' }
      ],
      subtotal: 550000,
      shipping: 25000,
      discount: 50000,
      tax: 0,
      total: 525000,
      currency: 'PKR',
      financial: 'paid',
      fulfillment: 'unfulfilled',
      placed_at: new Date().toISOString(),
      store_label: 'Online Store'
    };

    // 1. If custom HTML or custom template ID is requested
    if (options.customHTML) {
      const order = data.order || (data.orders && data.orders[0]) || sampleOrder;
      return this.templateManager.interpolate(options.customHTML, {
        order,
        storeSettings: options.storeSettings || {},
        options,
        item: data.item || (order.items && order.items[0]) || {}
      });
    }

    if (options.templateId) {
      const tpl = this.templateManager.getTemplateById(options.templateId);
      if (tpl && tpl.htmlContent) {
        const order = data.order || (data.orders && data.orders[0]) || sampleOrder;
        return this.templateManager.interpolate(tpl.htmlContent, {
          order,
          storeSettings: options.storeSettings || {},
          options: { ...options, pageSize: tpl.pageSize, marginMm: tpl.marginMm },
          item: data.item || (order.items && order.items[0]) || {}
        });
      }
    }

    if (kind === 'invoice') {
      if (data.orders && data.orders.length > 1) {
        const pages = data.orders.map((ord) => {
          const invNum = (this.db && this.db.documents && ord.id)
            ? this.db.documents.getOrAllocateInvoiceNumber(ord.id)
            : `INV-${ord.name ? ord.name.replace(/[^0-9]/g, '') : ord.id || '1001'}`;
          return renderInvoiceHTML({
            order: ord,
            invoiceNumber: invNum,
            storeSettings: options.storeSettings || {},
            pageSize: options.pageSize || 'A4'
          });
        });
        return this._concatPages(pages);
      }

      const order = data.order || (data.orders && data.orders[0]) || sampleOrder;
      const invoiceNumber =
        options.invoiceNumber ||
        ((this.db && this.db.documents && order.id)
          ? this.db.documents.getOrAllocateInvoiceNumber(order.id)
          : `INV-${order.name ? order.name.replace(/[^0-9]/g, '') : order.id || '1001'}`);

      return renderInvoiceHTML({
        order,
        invoiceNumber,
        storeSettings: options.storeSettings || {},
        pageSize: options.pageSize || 'A4'
      });
    }

    if (kind === 'packing_slip') {
      const ordersList = (data.orders && data.orders.length)
        ? data.orders
        : [data.order || sampleOrder];
      return renderPackingSlipHTML({
        orders: ordersList,
        isThermal: options.isThermal ?? (options.pageSize === 'thermal')
      });
    }

    if (kind === 'label') {
      const ordersList = (data.orders && data.orders.length)
        ? data.orders
        : [data.order || sampleOrder];

      if (ordersList.length > 1) {
        const pages = ordersList.map((order) =>
          renderShippingLabelHTML({
            order,
            trackingNumber: (options.trackingMap || {})[order.id] || options.trackingNumber || '',
            trackingCompany: options.trackingCompany || 'PostEx',
            senderInfo: options.senderInfo || {}
          })
        );
        return this._concatPages(pages);
      }

      const singleOrder = ordersList[0];
      return renderShippingLabelHTML({
        order: singleOrder,
        trackingNumber: options.trackingNumber || '',
        trackingCompany: options.trackingCompany || 'PostEx',
        senderInfo: options.senderInfo || {}
      });
    }

    if (kind === 'barcode') {
      if (data.items && data.items.length) {
        const pages = data.items.flatMap((item) =>
          Array.from({ length: item.copies || 1 }, () =>
            renderBarcodeLabelHTML({
              title: item.title || 'Product Label',
              sku: item.sku || 'SKU-001',
              barcode: item.barcode || item.sku || '12345678',
              price: item.price || 0,
              currency: options.currency || 'PKR'
            })
          )
        );
        return this._concatPages(pages);
      }

      return renderBarcodeLabelHTML({
        title: data.title || 'Product Label',
        sku: data.sku || 'SKU-001',
        barcode: data.barcode || data.sku || '12345678',
        price: data.price || 0,
        currency: options.currency || 'PKR'
      });
    }

    throw new Error(`Unsupported document kind: ${kind}`);
  }

  /**
   * Merge N standalone documents into one printable file.
   * Each template returns a full HTML doc, so pull out the bodies and
   * put a hard page break between them.
   */
  _concatPages(htmlDocs) {
    const bodies = htmlDocs.map((doc) => {
      const m = doc.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      return m ? m[1] : doc;
    });

    const styles = [];
    const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let match;
    while ((match = styleRe.exec(htmlDocs[0])) !== null) styles.push(match[1]);

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
${styles.join('\n')}
.od-page { page-break-after: always; break-after: page; }
.od-page:last-child { page-break-after: auto; break-after: auto; }
</style>
</head><body>
${bodies.map((b) => `<div class="od-page">${b}</div>`).join('\n')}
</body></html>`;
  }

  // ------------------------------------------------------------------ plumbing

  /**
   * Write HTML to a temp file and load it with loadFile.
   *
   * Why not data: URLs — they cap out on long documents (80 packing slips
   * blows past the limit), and they create an opaque origin, so every
   * remote product image in the template silently fails to load.
   */
  async _withRenderWindow(html, fn) {
    const tmpPath = path.join(
      os.tmpdir(),
      `od_print_${crypto.randomBytes(8).toString('hex')}.html`
    );
    fs.writeFileSync(tmpPath, html, 'utf8');
    this._tempFiles.add(tmpPath);

    const win = new BrowserWindow({
      show: false,
      width: 1000,
      height: 1400,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        offscreen: false,
        javascript: true
      }
    });

    try {
      await win.loadFile(tmpPath);
      // Barcode SVGs and web fonts render a tick after did-finish-load.
      await this._waitForPaint(win);
      return await fn(win);
    } finally {
      if (!win.isDestroyed()) win.destroy();
      this._cleanupTemp(tmpPath);
    }
  }

  _waitForPaint(win) {
    return win.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const done = () => requestAnimationFrame(() => requestAnimationFrame(resolve));
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(() => {
            const imgs = Array.from(document.images).filter(i => !i.complete);
            if (!imgs.length) return done();
            let left = imgs.length;
            const tick = () => (--left <= 0) && done();
            imgs.forEach(i => { i.addEventListener('load', tick); i.addEventListener('error', tick); });
            setTimeout(done, 3000);
          });
        } else { done(); }
      })
    `).catch(() => {});
  }

  _cleanupTemp(tmpPath) {
    try {
      fs.unlinkSync(tmpPath);
      this._tempFiles.delete(tmpPath);
    } catch { /* already gone */ }
  }

  _resolvePageOptions(kind, options) {
    if (options.preset && PAGE_PRESETS[options.preset]) {
      return PAGE_PRESETS[options.preset];
    }
    if (kind === 'label') return PAGE_PRESETS.label_4x6;
    if (kind === 'barcode') return PAGE_PRESETS.barcode_50x25;
    if (kind === 'packing_slip' && options.isThermal !== false) {
      return PAGE_PRESETS.thermal_100x150;
    }
    if (options.pageSize === 'A5') return PAGE_PRESETS.a5;
    return PAGE_PRESETS.a4;
  }

  // -------------------------------------------------------------------- output

  async generatePDF({ kind, data, options = {} }) {
    const html = await this.renderToHTML({ kind, data, options });
    const page = this._resolvePageOptions(kind, options);

    const pdfBuffer = await this._withRenderWindow(html, (win) =>
      win.webContents.printToPDF({
        printBackground: true,
        landscape: !!options.landscape,
        preferCSSPageSize: true,
        margins: { marginType: 'none' },
        ...page
      })
    );

    const stamp = new Date().toISOString().slice(0, 10);
    const fileName = `${kind}_${stamp}_${crypto.randomBytes(4).toString('hex')}.pdf`;
    const filePath = path.join(this.getDocDir(), fileName);
    fs.writeFileSync(filePath, pdfBuffer);

    const order = data.order || (data.orders && data.orders[0]) || null;
    let storeId = order ? order.store_id : (data.store_id || options.store_id || null);

    if (!storeId) {
      try {
        const firstStore = this.db.prepare('SELECT id FROM stores LIMIT 1').get();
        if (firstStore) storeId = firstStore.id;
      } catch {}
    }

    let docNumber = null;
    if (kind === 'invoice') {
      docNumber = options.invoiceNumber || this.db.documents.getOrAllocateInvoiceNumber(order && order.id);
    } else if (kind === 'barcode') {
      const firstItem = data.items && data.items[0];
      docNumber = firstItem ? (firstItem.sku || firstItem.title) : (data.sku || data.title || null);
    } else if (kind === 'label') {
      docNumber = options.trackingNumber || (order && order.name);
    } else if (order) {
      docNumber = order.name;
    }

    const docRecord = this.db.documents.create({
      store_id: storeId,
      order_id: order ? order.id : null,
      kind,
      number: docNumber,
      path: filePath
    });

    return {
      success: true,
      filePath,
      documentId: docRecord.id,
      invoiceNumber: kind === 'invoice' ? docNumber : null,
      pageCount: data.orders ? data.orders.length : 1
    };
  }

  /**
   * FIXED: the previous version returned a Promise from inside `try` while
   * `finally` closed the window. In an async function the `finally` runs the
   * moment the return statement executes — not when the promise settles — so
   * the window was destroyed mid-print and every silent print quietly failed.
   * The print is now awaited inside the try block.
   */
  async directPrint({ kind, data, options = {} }) {
    const html = await this.renderToHTML({ kind, data, options });
    const page = this._resolvePageOptions(kind, options);

    return this._withRenderWindow(html, (win) => {
      const printOptions = {
        silent: options.silent !== false,
        printBackground: true,
        deviceName: options.deviceName || '',
        copies: options.copies || 1,
        margins: { marginType: 'none' },
        ...(typeof page.pageSize === 'object'
          ? {
              pageSize: {
                width: Math.round(page.pageSize.width * 25400),   // in → microns
                height: Math.round(page.pageSize.height * 25400)
              }
            }
          : { pageSize: page.pageSize })
      };

      return new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('Print timed out after 60s — check the printer is online')),
          60000
        );

        win.webContents.print(printOptions, (success, errorType) => {
          clearTimeout(timer);
          if (!success) {
            // "cancelled" is a user action, not a failure worth throwing on
            if (errorType === 'cancelled') return resolve({ success: false, cancelled: true });
            return reject(new Error(`Print failed: ${errorType}`));
          }
          resolve({ success: true });
        });
      });
    });
  }

  /** HTML for the in-app preview iframe. No window, no file. */
  async previewHTML({ kind, data, options = {} }) {
    return this.renderToHTML({ kind, data, options });
  }

  /** Call on app quit so stray temp files don't accumulate. */
  cleanup() {
    for (const f of this._tempFiles) this._cleanupTemp(f);
  }
}

module.exports = PrintRenderer;
