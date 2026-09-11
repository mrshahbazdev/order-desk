function formatMoney(amountMinor, currency = 'PKR') {
  const val = (amountMinor / 100).toFixed(2);
  return `${currency} ${Number(val).toLocaleString()}`;
}

function renderInvoiceHTML({ order, invoiceNumber, storeSettings = {}, pageSize = 'A4' }) {
  const isA5 = pageSize === 'A5';
  const customer = order.customer || {};
  const shipping = order.shipping_address || {};
  const billing = order.billing_address || {};
  const items = order.items || [];

  const storeName = storeSettings.storeName || order.store_label || 'Order Desk Store';
  const storeAddress = storeSettings.storeAddress || 'Main Commercial Area, Lahore, Pakistan';
  const storePhone = storeSettings.storePhone || '+92 300 1234567';
  const storeEmail = storeSettings.storeEmail || 'support@orderdesk.local';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoiceNumber || order.name}</title>
  <style>
    @page {
      size: ${pageSize};
      margin: ${isA5 ? '10mm' : '15mm'};
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: ${isA5 ? '11px' : '13px'};
      line-height: 1.4;
      color: #1a202c;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .invoice-container {
      width: 100%;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .logo-text {
      font-size: ${isA5 ? '20px' : '24px'};
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .invoice-title {
      font-size: ${isA5 ? '20px' : '26px'};
      font-weight: 800;
      color: #1e293b;
      text-align: right;
    }
    .meta-table {
      width: 100%;
      margin-bottom: 20px;
      border-collapse: collapse;
    }
    .box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
      vertical-align: top;
      width: 48%;
    }
    .box-title {
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      margin-bottom: 15px;
    }
    .items-table th {
      background: #0f172a;
      color: #ffffff;
      padding: 8px 10px;
      text-align: left;
      font-weight: 600;
      font-size: ${isA5 ? '10px' : '11px'};
      text-transform: uppercase;
    }
    .items-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
    }
    .items-table tr:nth-child(even) td {
      background: #fafafa;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .totals-table {
      width: 40%;
      margin-left: auto;
      border-collapse: collapse;
    }
    .totals-table td {
      padding: 4px 8px;
    }
    .totals-table .grand-total {
      font-weight: 800;
      font-size: ${isA5 ? '13px' : '15px'};
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
      color: #0f172a;
    }
    .footer-note {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #64748b;
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      background: #e2e8f0;
    }
    .badge-paid { background: #dcfce7; color: #15803d; }
    .badge-pending { background: #fef3c7; color: #b45309; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <div class="logo-text">${storeName}</div>
          <div style="color: #64748b; margin-top: 4px;">${storeAddress}</div>
          <div style="color: #64748b;">${storePhone} | ${storeEmail}</div>
        </td>
        <td style="vertical-align: top; text-align: right;">
          <div class="invoice-title">INVOICE</div>
          <div style="font-weight: 700; color: #0f172a; margin-top: 4px;"># ${invoiceNumber || order.name}</div>
          <div style="color: #64748b; font-size: 12px;">Order Ref: ${order.name}</div>
          <div style="color: #64748b; font-size: 12px;">Date: ${new Date(order.placed_at || Date.now()).toLocaleDateString()}</div>
          <div style="margin-top: 6px;">
            <span class="badge ${order.financial === 'paid' ? 'badge-paid' : 'badge-pending'}">${order.financial || 'pending'}</span>
          </div>
        </td>
      </tr>
    </table>

    <table class="meta-table">
      <tr>
        <td class="box">
          <div class="box-title">Billed To</div>
          <div style="font-weight: 700;">${customer.firstName || ''} ${customer.lastName || ''}</div>
          <div>${billing.address1 || shipping.address1 || ''}</div>
          <div>${billing.city || shipping.city || ''} ${billing.province || shipping.province || ''} ${billing.zip || shipping.zip || ''}</div>
          <div>${order.email || ''}</div>
          <div>${order.phone || ''}</div>
        </td>
        <td style="width: 4%;"></td>
        <td class="box">
          <div class="box-title">Shipping Address</div>
          <div style="font-weight: 700;">${shipping.name || (customer.firstName + ' ' + customer.lastName)}</div>
          <div>${shipping.address1 || ''}</div>
          ${shipping.address2 ? `<div>${shipping.address2}</div>` : ''}
          <div>${shipping.city || ''}, ${shipping.province || ''} ${shipping.zip || ''}</div>
          <div>${shipping.country || ''}</div>
          <div>Phone: ${shipping.phone || order.phone || '-'}</div>
        </td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th>Item / Description</th>
          <th>SKU</th>
          <th class="text-center">Qty</th>
          <th class="text-right">Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td>
              <div style="font-weight: 600;">${item.title}</div>
              ${item.variant ? `<div style="font-size: 11px; color: #64748b;">${item.variant}</div>` : ''}
            </td>
            <td><code style="font-size: 11px;">${item.sku || '-'}</code></td>
            <td class="text-center">${item.qty}</td>
            <td class="text-right">${formatMoney(item.price, order.currency)}</td>
            <td class="text-right" style="font-weight: 600;">${formatMoney(item.total, order.currency)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <table class="totals-table">
      <tr>
        <td style="color: #64748b;">Subtotal:</td>
        <td class="text-right">${formatMoney(order.subtotal, order.currency)}</td>
      </tr>
      ${order.discount > 0 ? `
      <tr>
        <td style="color: #16a34a;">Discount:</td>
        <td class="text-right" style="color: #16a34a;">-${formatMoney(order.discount, order.currency)}</td>
      </tr>` : ''}
      <tr>
        <td style="color: #64748b;">Shipping:</td>
        <td class="text-right">${formatMoney(order.shipping, order.currency)}</td>
      </tr>
      ${order.tax > 0 ? `
      <tr>
        <td style="color: #64748b;">Tax:</td>
        <td class="text-right">${formatMoney(order.tax, order.currency)}</td>
      </tr>` : ''}
      <tr class="grand-total">
        <td>Total:</td>
        <td class="text-right">${formatMoney(order.total, order.currency)}</td>
      </tr>
    </table>

    ${order.note ? `
      <div style="margin-top: 15px; padding: 10px; background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 4px; font-size: 11px;">
        <strong>Customer Note:</strong> ${order.note}
      </div>
    ` : ''}

    <div class="footer-note">
      Thank you for your business! For any questions regarding this invoice, please contact ${storeEmail}.
    </div>
  </div>
</body>
</html>
  `.trim();
}

module.exports = { renderInvoiceHTML };
