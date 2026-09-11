const { generateBarcodeSVG } = require('../barcode-generator.cjs');

function renderShippingLabelHTML({ order, trackingNumber = '', trackingCompany = 'PostEx', senderInfo = {} }) {
  const shipping = order.shipping_address || {};
  const customer = order.customer || {};

  const senderName = senderInfo.name || 'Order Desk Merchant';
  const senderAddress = senderInfo.address || 'Lahore Distribution Center';
  const senderPhone = senderInfo.phone || '+92 300 0000000';

  const trackBarcode = trackingNumber || order.name.replace(/[^a-zA-Z0-9]/g, '');
  const barcodeSVG = generateBarcodeSVG(trackBarcode, { height: 45, barWidth: 1.8, fontSize: 12, showText: true });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Shipping Label ${order.name}</title>
  <style>
    @page {
      size: 4in 6in;
      margin: 3mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.2;
      color: #000;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .label-box {
      border: 2px solid #000;
      width: 100%;
      height: 100%;
      padding: 6px;
      display: flex;
      flex-direction: column;
    }
    .carrier-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #000;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .carrier-name {
      font-size: 20px;
      font-weight: 900;
    }
    .service-badge {
      font-size: 14px;
      font-weight: 800;
      border: 1px solid #000;
      padding: 2px 6px;
    }
    .sender-box {
      font-size: 9px;
      border-bottom: 1px solid #000;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .recipient-box {
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .recipient-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .recipient-name {
      font-size: 16px;
      font-weight: 900;
      margin-top: 2px;
    }
    .recipient-address {
      font-size: 13px;
      font-weight: 700;
      margin-top: 2px;
    }
    .barcode-container {
      text-align: center;
      margin: 10px 0;
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
    }
    .barcode-svg {
      max-width: 90%;
      height: 50px;
    }
    .barcode-text {
      font-family: monospace;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 2px;
    }
    .cod-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 2px solid #000;
      padding: 6px;
      margin-top: auto;
      background: #f0f0f0;
    }
    .cod-amount {
      font-size: 18px;
      font-weight: 900;
    }
  </style>
</head>
<body>
  <div class="label-box">
    <div class="carrier-row">
      <div class="carrier-name">${trackingCompany.toUpperCase()}</div>
      <div class="service-badge">EXPRESS / COD</div>
    </div>

    <div class="sender-box">
      <strong>FROM:</strong> ${senderName}, ${senderAddress} | Tel: ${senderPhone}
    </div>

    <div class="recipient-box">
      <div class="recipient-title">SHIP TO:</div>
      <div class="recipient-name">${shipping.name || customer.firstName || 'Customer'}</div>
      <div class="recipient-address">
        ${shipping.address1 || ''} ${shipping.address2 || ''}<br/>
        ${shipping.city || ''}, ${shipping.province || ''} ${shipping.zip || ''}<br/>
        ${shipping.country || 'Pakistan'}
      </div>
      <div style="font-size: 12px; font-weight: 700; margin-top: 4px;">
        TEL: ${shipping.phone || order.phone || '-'}
      </div>
    </div>

    <div class="barcode-container">
      <div style="width: 100%; max-width: 320px; margin: 0 auto;">
        ${barcodeSVG}
      </div>
      <div style="font-size: 10px; margin-top: 4px;">Order: ${order.name} | Items: ${(order.items || []).length}</div>
    </div>

    <div class="cod-box">
      <div>
        <div style="font-size: 10px; font-weight: 700;">COLLECT CASH (COD):</div>
        <div style="font-size: 9px; color: #555;">Payment: ${order.financial === 'paid' ? 'PAID ONLINE (Do Not Collect)' : 'CASH ON DELIVERY'}</div>
      </div>
      <div class="cod-amount">
        ${order.financial === 'paid' ? 'PKR 0' : `${order.currency} ${(order.total / 100).toLocaleString()}`}
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

module.exports = { renderShippingLabelHTML };
