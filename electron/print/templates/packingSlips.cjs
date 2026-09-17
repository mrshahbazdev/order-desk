function renderPackingSlipHTML({ orders, isThermal = true, isPartial = false, packedItems = [] }) {
  const pageSize = isThermal ? '100mm 150mm' : 'A4';
  const orderList = Array.isArray(orders) ? orders : [orders];

  const packedMap = new Map();
  if (Array.isArray(packedItems) && packedItems.length > 0) {
    for (const item of packedItems) {
      if (item.sku) packedMap.set(String(item.sku).toLowerCase(), item.packed);
      if (item.id) packedMap.set(String(item.id), item.packed);
    }
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Packing Slips</title>
  <style>
    @page {
      size: ${pageSize};
      margin: ${isThermal ? '5mm' : '15mm'};
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: ${isThermal ? '11px' : '13px'};
      line-height: 1.3;
      color: #000;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .slip-page {
      page-break-after: always;
      padding-bottom: 10px;
    }
    .slip-page:last-child {
      page-break-after: avoid;
    }
    .slip-header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #000;
      padding-bottom: 6px;
      margin-bottom: 10px;
    }
    .slip-title {
      font-size: ${isThermal ? '16px' : '20px'};
      font-weight: 900;
    }
    .order-num {
      font-size: ${isThermal ? '14px' : '18px'};
      font-weight: 800;
      text-align: right;
    }
    .partial-badge {
      display: inline-block;
      background: #fef08a;
      color: #854d0e;
      border: 1px solid #ca8a04;
      font-weight: 800;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 3px;
      margin-top: 2px;
    }
    .address-block {
      border: 1px solid #000;
      border-radius: 4px;
      padding: 6px 8px;
      margin-bottom: 10px;
      background: #fafafa;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    .items-table th {
      border-bottom: 1px solid #000;
      padding: 4px 2px;
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
    }
    .items-table td {
      border-bottom: 1px dashed #ccc;
      padding: 5px 2px;
    }
    .checkbox-col {
      width: 20px;
      text-align: center;
    }
    .check-box {
      width: 12px;
      height: 12px;
      border: 1px solid #000;
      display: inline-block;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .footer-bar {
      border-top: 1px solid #000;
      padding-top: 4px;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
    }
  </style>
</head>
<body>
  ${orderList.map((order, idx) => {
    const shipping = order.shipping_address || {};
    const items = (order.items || []).slice().sort((a, b) => (a.sku || '').localeCompare(b.sku || ''));
    const isPartialOrder = isPartial || order.fulfillment === 'partial';
    const totalQty = items.reduce((acc, item) => acc + (item.qty || 1), 0);

    return `
      <div class="slip-page">
        <div class="slip-header">
          <div>
            <div class="slip-title">PACKING SLIP</div>
            <div style="font-size: 10px; color: #555;">${order.store_label || 'Skulane'}</div>
            ${isPartialOrder ? '<div class="partial-badge">PARTIAL SHIPMENT</div>' : ''}
          </div>
          <div>
            <div class="order-num">${order.name}</div>
            <div style="font-size: 10px; color: #555;">${new Date(order.placed_at || Date.now()).toLocaleDateString()}</div>
          </div>
        </div>

        <div class="address-block">
          <div style="font-weight: 700; font-size: 11px;">Deliver To:</div>
          <div><strong>${shipping.name || order.customer?.firstName || 'Customer'}</strong></div>
          <div>${shipping.address1 || ''} ${shipping.address2 || ''}</div>
          <div>${shipping.city || ''}, ${shipping.province || ''} ${shipping.zip || ''}</div>
          <div>Tel: ${shipping.phone || order.phone || '-'}</div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th class="checkbox-col">✓</th>
              <th>SKU / Item</th>
              <th class="text-center" style="width: 55px;">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => {
              const packedCount = packedMap.get(String(item.id)) ?? 
                                  packedMap.get(String(item.sku || '').toLowerCase()) ?? 
                                  item.qty;
              const hasRemaining = isPartialOrder && packedCount < item.qty;

              return `
                <tr>
                  <td class="checkbox-col"><span class="check-box">${packedCount > 0 ? '✓' : ''}</span></td>
                  <td>
                    <div style="font-weight: 700;">${item.sku || 'NO-SKU'}</div>
                    <div style="font-size: 10px;">${item.title} ${item.variant ? `(${item.variant})` : ''}</div>
                    ${hasRemaining ? `<div style="font-size: 9px; color: #b45309; font-weight: 700;">Remaining/Backorder: ${item.qty - packedCount}</div>` : ''}
                  </td>
                  <td class="text-center" style="font-weight: 800; font-size: 13px;">
                    ${isPartialOrder ? `${packedCount} / ${item.qty}` : item.qty}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        ${order.note ? `
          <div style="border: 1px dashed #eab308; background: #fefce8; padding: 4px 6px; font-size: 10px; margin-bottom: 8px;">
            <strong>Note:</strong> ${order.note}
          </div>
        ` : ''}

        <div class="footer-bar">
          <div>Items: ${items.length} (Total Units: ${totalQty})</div>
          <div>Slip ${idx + 1} of ${orderList.length}</div>
        </div>
      </div>
    `;
  }).join('')}
</body>
</html>
  `.trim();
}

module.exports = { renderPackingSlipHTML };

