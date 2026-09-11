const crypto = require('crypto');
const { generateBarcodeSVG } = require('./barcode-generator.cjs');

// Default built-in templates
const DEFAULT_TEMPLATES = [
  {
    id: 'tpl_invoice_a4',
    name: 'Modern Tax Invoice (A4/A5)',
    kind: 'invoice',
    isDefault: true,
    isSystem: true,
    pageSize: 'A4',
    customWidthMm: 210,
    customHeightMm: 297,
    marginMm: 12,
    orientation: 'portrait',
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice {{order.name}}</title>
  <style>
    @page { size: {{page_size}}; margin: {{page_margin}}mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 13px;
      color: #1e293b;
      margin: 0; padding: 0; background: #fff; line-height: 1.4;
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px; }
    .brand-title { font-size: 24px; font-weight: 900; color: #2563eb; letter-spacing: -0.5px; }
    .invoice-badge { font-size: 22px; font-weight: 800; color: #0f172a; text-align: right; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 20px; }
    .grid-2 { display: flex; justify-content: space-between; gap: 20px; }
    .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
    table.items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    table.items-table th { background: #f1f5f9; color: #334155; font-size: 11px; font-weight: 800; text-transform: uppercase; text-align: left; padding: 10px; border-bottom: 2px solid #cbd5e1; }
    table.items-table td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
    .totals-container { margin-left: auto; width: 280px; }
    .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
    .grand-total { border-top: 2px solid #0f172a; font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 6px; padding-top: 6px; }
    .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-title">{{store.name}}</div>
      <div style="font-size: 12px; color: #64748b; margin-top: 4px;">{{store.address}}</div>
      <div style="font-size: 12px; color: #64748b;">Phone: {{store.phone}} · {{store.email}}</div>
    </div>
    <div>
      <div class="invoice-badge">TAX INVOICE</div>
      <div style="font-size: 12px; color: #64748b; text-align: right; margin-top: 4px;">Invoice #: <strong>{{invoice.number}}</strong></div>
      <div style="font-size: 12px; color: #64748b; text-align: right;">Order: <strong>{{order.name}}</strong> · {{invoice.date}}</div>
    </div>
  </div>

  <div class="meta-box grid-2">
    <div>
      <div class="section-title">Billed & Shipped To:</div>
      <div style="font-weight: 700; font-size: 14px;">{{customer.name}}</div>
      <div>{{shipping.address1}}</div>
      <div>{{shipping.city}}, {{shipping.province}} {{shipping.zip}}</div>
      <div>Phone: {{customer.phone}}</div>
    </div>
    <div style="text-align: right;">
      <div class="section-title">Payment & Status:</div>
      <div>Status: <strong>{{order.financial}}</strong></div>
      <div>Fulfillment: <strong>{{order.fulfillment}}</strong></div>
      <div>Tracking: <strong>{{tracking.number}}</strong> ({{tracking.company}})</div>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 50%;">Item & Description</th>
        <th style="width: 20%;">SKU</th>
        <th style="width: 10%; text-align: center;">Qty</th>
        <th style="width: 20%; text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      {{items_table_rows}}
    </tbody>
  </table>

  <div class="totals-container">
    <div class="total-row"><span>Subtotal:</span><span>{{order.subtotal}}</span></div>
    <div class="total-row"><span>Shipping:</span><span>{{order.shipping}}</span></div>
    <div class="total-row"><span>Discount:</span><span>-{{order.discount}}</span></div>
    <div class="total-row grand-total"><span>Total Payable:</span><span>{{order.total}}</span></div>
  </div>

  <div class="footer">
    <div>{{footer_note}}</div>
    <div style="margin-top: 4px;">Generated locally via Order Desk · Thank you for your business!</div>
  </div>
</body>
</html>`
  },
  {
    id: 'tpl_thermal_label_4x6',
    name: 'Thermal Courier Shipping Label (4x6)',
    kind: 'label',
    isDefault: true,
    isSystem: true,
    pageSize: '4x6',
    customWidthMm: 101.6,
    customHeightMm: 152.4,
    marginMm: 3,
    orientation: 'portrait',
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Shipping Label {{order.name}}</title>
  <style>
    @page { size: 4in 6in; margin: 3mm; }
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #000;
      margin: 0; padding: 0; background: #fff; line-height: 1.25;
    }
    .label-box {
      border: 3px solid #000;
      width: 100%;
      height: 100%;
      padding: 8px;
      display: flex;
      flex-direction: column;
    }
    .carrier-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #000;
      padding-bottom: 6px;
      margin-bottom: 6px;
    }
    .carrier-title { font-size: 22px; font-weight: 900; }
    .service-type { font-size: 14px; font-weight: 800; border: 2px solid #000; padding: 2px 8px; border-radius: 3px; }
    .barcode-area {
      text-align: center;
      padding: 10px 0;
      border-bottom: 2px solid #000;
      margin-bottom: 8px;
    }
    .barcode-val { font-family: monospace; font-size: 15px; font-weight: 800; letter-spacing: 2px; }
    .sender-box { font-size: 10px; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 6px; }
    .ship-to-box {
      border: 2px solid #000;
      padding: 8px;
      margin-bottom: 8px;
      background: #fafafa;
    }
    .ship-to-title { font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px; }
    .customer-name { font-size: 16px; font-weight: 900; }
    .customer-address { font-size: 13px; font-weight: 700; margin-top: 3px; }
    .city-badge { font-size: 18px; font-weight: 900; text-transform: uppercase; margin-top: 4px; }
    .order-summary-box {
      border: 1px solid #000;
      padding: 6px;
      font-size: 10px;
      margin-top: auto;
    }
    .cod-badge {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #000;
      color: #fff;
      padding: 6px 10px;
      font-size: 15px;
      font-weight: 900;
      margin-top: 6px;
    }
  </style>
</head>
<body>
  <div class="label-box">
    <div class="carrier-header">
      <div class="carrier-title">{{tracking.company}}</div>
      <div class="service-type">STANDARD EXPRESS</div>
    </div>

    <div class="barcode-area">
      <div style="max-width: 320px; margin: 0 auto;">{{tracking.barcode_svg}}</div>
    </div>

    <div class="sender-box">
      <strong>FROM:</strong> {{store.name}} · {{store.address}} · Ph: {{store.phone}}
    </div>

    <div class="ship-to-box">
      <div class="ship-to-title">DELIVER TO:</div>
      <div class="customer-name">{{customer.name}}</div>
      <div class="customer-address">{{shipping.address1}}</div>
      <div class="city-badge">📍 {{shipping.city}} ({{shipping.province}})</div>
      <div style="font-size: 13px; font-weight: 800; margin-top: 2px;">📞 {{customer.phone}}</div>
    </div>

    <div class="order-summary-box">
      <div><strong>Order:</strong> {{order.name}} · <strong>Date:</strong> {{invoice.date}}</div>
      <div style="margin-top: 2px;"><strong>Items:</strong> {{order.item_count}} Units (Checklist inside)</div>
    </div>

    <div class="cod-badge">
      <span>COLLECT CASH (COD):</span>
      <span>{{order.total}}</span>
    </div>
  </div>
</body>
</html>`
  },
  {
    id: 'tpl_pos_receipt_80mm',
    name: 'Thermal POS Receipt (80mm Roll)',
    kind: 'invoice',
    isDefault: false,
    isSystem: true,
    pageSize: '80mm',
    customWidthMm: 80,
    customHeightMm: 180,
    marginMm: 2,
    orientation: 'portrait',
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt {{order.name}}</title>
  <style>
    @page { size: 80mm 200mm; margin: 3mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      color: #000;
      margin: 0; padding: 0; background: #fff; line-height: 1.3;
    }
    .receipt { width: 100%; text-align: center; }
    .store-name { font-size: 16px; font-weight: 900; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    table.items { width: 100%; border-collapse: collapse; text-align: left; margin: 6px 0; }
    table.items th { font-size: 10px; border-bottom: 1px dashed #000; padding: 3px 0; }
    table.items td { font-size: 10px; padding: 4px 0; vertical-align: top; }
    .totals { width: 100%; text-align: right; margin-top: 6px; }
    .total-line { display: flex; justify-content: space-between; margin: 2px 0; }
    .grand { font-size: 14px; font-weight: 900; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="store-name">{{store.name}}</div>
    <div style="font-size: 10px;">{{store.address}}</div>
    <div style="font-size: 10px;">Tel: {{store.phone}}</div>
    <div class="divider"></div>

    <div style="text-align: left; font-size: 10px;">
      <div>Order: <strong>{{order.name}}</strong></div>
      <div>Date: {{invoice.date}}</div>
      <div>Customer: {{customer.name}}</div>
      <div>Phone: {{customer.phone}}</div>
    </div>

    <div class="divider"></div>

    <table class="items">
      <thead>
        <tr>
          <th style="width: 55%;">Item</th>
          <th style="width: 15%; text-align: center;">Qty</th>
          <th style="width: 30%; text-align: right;">Price</th>
        </tr>
      </thead>
      <tbody>
        {{items_table_rows}}
      </tbody>
    </table>

    <div class="divider"></div>

    <div class="totals">
      <div class="total-line"><span>Subtotal:</span><span>{{order.subtotal}}</span></div>
      <div class="total-line"><span>Shipping:</span><span>{{order.shipping}}</span></div>
      <div class="total-line grand"><span>TOTAL:</span><span>{{order.total}}</span></div>
    </div>

    <div class="divider"></div>
    <div style="font-size: 9px; text-align: center; margin-top: 6px;">
      * Thank You For Your Purchase! *<br>
      {{footer_note}}
    </div>
  </div>
</body>
</html>`
  },
  {
    id: 'tpl_barcode_tag_50x25',
    name: 'Barcode & Price Sticker (50x25mm)',
    kind: 'barcode',
    isDefault: true,
    isSystem: true,
    pageSize: '50x25',
    customWidthMm: 50,
    customHeightMm: 25,
    marginMm: 1,
    orientation: 'landscape',
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Barcode Label</title>
  <style>
    @page { size: 50mm 25mm; margin: 1mm; }
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      margin: 0; padding: 2mm; text-align: center; background: #fff;
    }
    .title { font-size: 8px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sku { font-size: 8.5px; font-family: monospace; font-weight: 800; margin: 1px 0; color: #1e293b; }
    .barcode-wrapper { width: 100%; max-width: 46mm; margin: 1px auto; display: flex; justify-content: center; }
    .price { font-size: 10.5px; font-weight: 900; margin-top: 1px; color: #000; }
  </style>
</head>
<body>
  <div class="title">{{item.title}}</div>
  <div class="sku">{{item.sku}}</div>
  <div class="barcode-wrapper">{{item.barcode_svg}}</div>
  <div class="price">{{item.price}}</div>
</body>
</html>`
  }
];

class CustomTemplateManager {
 constructor(db) {
 this.db = db;
 }

 getTemplates() {
 const saved = this.db.getSetting('custom_templates_v2', null);
 if (!saved) return DEFAULT_TEMPLATES;
 try {
 const userList = JSON.parse(saved);
 const existingIds = new Set(userList.map(t => t.id));
 const combined = [...userList];
 for (const sys of DEFAULT_TEMPLATES) {
 if (!existingIds.has(sys.id)) {
 combined.push(sys);
 }
 }
 return combined;
 } catch {
 return DEFAULT_TEMPLATES;
 }
 }

 getTemplateById(id) {
 const all = this.getTemplates();
 return all.find(t => t.id === id) || all[0];
 }

 saveTemplate(tplData) {
 const all = this.getTemplates();
 const id = tplData.id || ('tpl_custom_' + Date.now());
 const cleanTpl = {
 ...tplData,
 id,
 updatedAt: new Date().toISOString()
 };

 const idx = all.findIndex(t => t.id === id);
 if (idx >= 0) {
 all[idx] = cleanTpl;
 } else {
 all.push(cleanTpl);
 }

 this.db.setSetting('custom_templates_v2', JSON.stringify(all));
 return cleanTpl;
 }

 deleteTemplate(id) {
 const all = this.getTemplates().filter(t => t.id !== id);
 this.db.setSetting('custom_templates_v2', JSON.stringify(all));
 return { success: true };
 }

 resetTemplates() {
 this.db.setSetting('custom_templates_v2', JSON.stringify(DEFAULT_TEMPLATES));
 return DEFAULT_TEMPLATES;
 }

 interpolate(html, { order = {}, storeSettings = {}, options = {}, item = {} }) {
 if (!html) return '';

 const customer = order.customer || order.customer_json || {};
 const shipping = order.shipping_address || order.ship_json || {};
 const items = order.items || [];
 const currency = order.currency || 'PKR';

 const fmtMoney = (valMinor) => {
 const v = typeof valMinor === 'number' ? valMinor : 0;
 return currency + ' ' + (v / 100).toLocaleString();
 };

 const pageSize = options.pageSize || 'A4';
 const margin = options.marginMm || 10;

 const itemsRowsHtml = items.map(it => {
 return '<tr><td><div style=font-weight: 700;>' + (it.title || 'Product') + '</div>' +
 (it.variant ? '<div style=font-size: 10px; color: #64748b;>' + it.variant + '</div>' : '') +
 '</td><td style=font-family: monospace; font-size: 11px;>' + (it.sku || '—') + '</td>' +
 '<td style=text-align: center; font-weight: 700;>' + (it.qty || 1) + '</td>' +
 '<td style=text-align: right; font-weight: 700;>' + fmtMoney(it.price * (it.qty || 1)) + '</td></tr>';
 }).join('');

 const barcodeVal = item.barcode || item.sku || '890123456789';
 const barcodeSVG = generateBarcodeSVG(barcodeVal, { height: 28, barWidth: 1.3, fontSize: 10, showText: true });
 const trackingBarcodeVal = options.trackingNumber || (order.name ? order.name.replace(/[^0-9]/g, '') : '998811');
 const trackingBarcodeSVG = generateBarcodeSVG(trackingBarcodeVal, { height: 42, barWidth: 1.6, fontSize: 11, showText: true });

 const placeholders = {
 '{{page_size}}': pageSize === 'A5' ? 'A5' : pageSize === '80mm' ? '80mm 200mm' : pageSize === '4x6' ? '4in 6in' : 'A4',
 '{{page_margin}}': String(margin),
 '{{order.name}}': order.name || '#1001',
 '{{order.id}}': String(order.id || '1001'),
 '{{order.number}}': String(order.number || '1001'),
 '{{order.financial}}': (order.financial || 'paid').toUpperCase(),
 '{{order.fulfillment}}': (order.fulfillment || 'unfulfilled').toUpperCase(),
 '{{order.subtotal}}': fmtMoney(order.subtotal || 0),
 '{{order.shipping}}': fmtMoney(order.shipping || 0),
 '{{order.tax}}': fmtMoney(order.tax || 0),
 '{{order.discount}}': fmtMoney(order.discount || 0),
 '{{order.total}}': fmtMoney(order.total || 0),
 '{{order.currency}}': currency,
 '{{order.item_count}}': String(items.reduce((s, i) => s + (i.qty || 1), 0) || items.length || 1),
 '{{customer.name}}': customer.name || (customer.first_name ? (customer.first_name + ' ' + (customer.last_name || '')) : 'Customer'),
 '{{customer.phone}}': customer.phone || order.phone || '—',
 '{{customer.email}}': customer.email || order.email || '—',
 '{{shipping.address1}}': shipping.address1 || 'Street Address',
 '{{shipping.city}}': shipping.city || 'City',
 '{{shipping.province}}': shipping.province || 'Province',
 '{{shipping.zip}}': shipping.zip || 'Zip',
 '{{shipping.country}}': shipping.country || 'Country',
 '{{store.name}}': storeSettings.storeName || order.store_label || 'Order Desk Store',
 '{{store.address}}': storeSettings.storeAddress || 'Commercial Area, Lahore, Pakistan',
 '{{store.phone}}': storeSettings.storePhone || '+92 300 1234567',
 '{{store.email}}': storeSettings.storeEmail || 'support@orderdesk.local',
 '{{invoice.number}}': options.invoiceNumber || ('INV-' + (order.name ? order.name.replace(/[^0-9]/g, '') : '1001')),
 '{{invoice.date}}': new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
 '{{tracking.number}}': options.trackingNumber || ('TRK-' + (order.name ? order.name.replace(/[^0-9]/g, '') : '998811')),
 '{{tracking.company}}': options.trackingCompany || 'Trax Express',
 '{{tracking.barcode_svg}}': trackingBarcodeSVG,
 '{{footer_note}}': options.footerNote || 'Thank you for shopping with us! For returns/exchange contact our support.',
 '{{items_table_rows}}': itemsRowsHtml || '<tr><td colspan=4>No items</td></tr>',
 '{{item.title}}': item.title || 'Product Name',
 '{{item.sku}}': item.sku || 'SKU-001',
 '{{item.barcode}}': barcodeVal,
 '{{item.barcode_svg}}': barcodeSVG,
 '{{item.price}}': item.price ? fmtMoney(item.price) : 'PKR 2,500',
 '*{{item.barcode}}*': barcodeSVG,
 '*{{tracking.number}}*': trackingBarcodeSVG
 };

 let result = html;
 for (const [tag, val] of Object.entries(placeholders)) {
 result = result.split(tag).join(val);
 }
 return result;
 }
}

module.exports = CustomTemplateManager;
