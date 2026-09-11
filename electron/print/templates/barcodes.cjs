const { generateBarcodeSVG } = require('../barcode-generator.cjs');

function renderBarcodeLabelHTML({ title, sku, barcode, price, currency = 'PKR' }) {
  const displayPrice = price ? `${currency} ${(price / 100).toLocaleString()}` : '';
  const codeValue = barcode || sku || '000000';
  const barcodeSVG = generateBarcodeSVG(codeValue, { height: 28, barWidth: 1.3, fontSize: 10, showText: true });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Barcode ${codeValue}</title>
  <style>
    @page {
      size: 50mm 25mm;
      margin: 0.5mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      margin: 0;
      padding: 1.5mm 1mm;
      text-align: center;
      background: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
    }
    .title {
      font-size: 8.5px;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 48mm;
      margin-bottom: 1px;
    }
    .sku {
      font-size: 8.5px;
      font-family: monospace;
      font-weight: 800;
      color: #1e293b;
      margin-bottom: 2px;
    }
    .barcode-wrapper {
      width: 100%;
      max-width: 46mm;
      display: flex;
      justify-content: center;
      margin: 1px 0;
    }
    .price {
      font-size: 10.5px;
      font-weight: 900;
      margin-top: 1px;
      color: #000;
    }
  </style>
</head>
<body>
  <div class="title">${title || 'Product'}</div>
  ${sku ? `<div class="sku">${sku}</div>` : ''}
  <div class="barcode-wrapper">
    ${barcodeSVG}
  </div>
  ${displayPrice ? `<div class="price">${displayPrice}</div>` : ''}
</body>
</html>
  `.trim();
}

module.exports = { renderBarcodeLabelHTML };
