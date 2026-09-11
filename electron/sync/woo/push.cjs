function isDemoOrLocal(id) {
  if (!id) return true;
  const str = String(id).trim().toLowerCase();
  return str.startsWith('demo_') || str.startsWith('local_') || str.includes('sample') || str.startsWith('item_');
}

async function fulfillWooOrder({ client, remoteOrderId, trackingNumber, trackingCompany = 'PostEx', customerNote = '', isPartial = false, packedItems = [] }) {
  if (isDemoOrLocal(remoteOrderId)) {
    console.log(`[WooPush] Skipping remote fulfillment for demo/local order: ${remoteOrderId}`);
    return { success: true, status: isPartial ? 'partial' : 'completed', simulated: true };
  }

  const packedSummary = Array.isArray(packedItems) && packedItems.length > 0
    ? `Packed: ${packedItems.map(p => `${p.packed || p.qty}x ${p.sku || p.title}`).join(', ')}`
    : '';

  const noteText = trackingNumber 
    ? `Dispatched via ${trackingCompany}. Tracking: ${trackingNumber}. ${isPartial ? '(PARTIAL SHIPMENT) ' : ''}${packedSummary} ${customerNote}`.trim()
    : (customerNote || (isPartial ? 'Partial shipment dispatched' : 'Order fulfilled and completed'));

  // Update order status: completed if full, or keep processing/partial with note if partial
  const targetStatus = isPartial ? 'processing' : 'completed';
  await client.request(`orders/${remoteOrderId}`, {
    method: 'PUT',
    body: {
      status: targetStatus
    }
  });

  // Add customer order note
  await client.request(`orders/${remoteOrderId}/notes`, {
    method: 'POST',
    body: {
      note: noteText,
      customer_note: true
    }
  });

  return { success: true, status: targetStatus };
}

async function updateWooOrderDetails({ client, remoteOrderId, note, status }) {
  if (isDemoOrLocal(remoteOrderId)) {
    console.log(`[WooPush] Skipping remote order update for demo/local order: ${remoteOrderId}`);
    return { success: true, simulated: true };
  }

  const body = {};
  if (status) body.status = status;
  if (note !== undefined) body.customer_note = note;

  const res = await client.request(`orders/${remoteOrderId}`, {
    method: 'PUT',
    body
  });

  return res.data;
}

async function updateWooInventory({ client, remoteVariantId, newStock }) {
  if (isDemoOrLocal(remoteVariantId)) {
    console.log(`[WooPush] Skipping remote inventory push for demo/local variant: ${remoteVariantId}`);
    return { success: true, simulated: true };
  }

  const res = await client.request(`products/${remoteVariantId}`, {
    method: 'PUT',
    body: {
      manage_stock: true,
      stock_quantity: parseInt(newStock, 10) || 0
    }
  });

  return res.data;
}

module.exports = {
  fulfillWooOrder,
  updateWooOrderDetails,
  updateWooInventory
};
