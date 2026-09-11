const FULFILLMENT_ORDERS_QUERY = `
  query GetFulfillmentOrders($orderId: ID!) {
    order(id: $orderId) {
      fulfillmentOrders(first: 10) {
        edges {
          node {
            id
            status
            lineItems(first: 50) {
              edges {
                node {
                  id
                  totalQuantity
                  remainingQuantity
                }
              }
            }
          }
        }
      }
    }
  }
`;

const FULFILLMENT_CREATE_MUTATION = `
  mutation FulfillmentCreateV2($fulfillment: FulfillmentV2Input!) {
    fulfillmentCreateV2(fulfillment: $fulfillment) {
      fulfillment {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const ORDER_UPDATE_MUTATION = `
  mutation OrderUpdate($input: OrderInput!) {
    orderUpdate(input: $input) {
      order {
        id
        tags
        note
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const INVENTORY_SET_MUTATION = `
  mutation InventorySetQuantities($input: InventorySetQuantitiesInput!) {
    inventorySetQuantities(input: $input) {
      userErrors {
        field
        message
      }
    }
  }
`;

function formatShopifyGid(id, type = 'Order') {
  if (!id) return null;
  const str = String(id).trim();
  if (str.startsWith('gid://shopify/')) return str;
  if (/^\d+$/.test(str)) return `gid://shopify/${type}/${str}`;
  return str;
}

function isDemoOrLocal(id) {
  if (!id) return true;
  const str = String(id).trim().toLowerCase();
  return str.startsWith('demo_') || str.startsWith('local_') || str.includes('sample') || str.startsWith('item_');
}

async function fulfillShopifyOrder({ client, remoteOrderId, trackingNumber, trackingCompany = 'PostEx', notifyCustomer = true, isPartial = false, packedItems = [] }) {
  if (isDemoOrLocal(remoteOrderId)) {
    console.log(`[ShopifyPush] Skipping remote fulfillment for demo/local order: ${remoteOrderId}`);
    return { id: 'demo_fulfillment', status: 'SUCCESS', simulated: true };
  }

  const formattedOrderId = formatShopifyGid(remoteOrderId, 'Order');

  // 1. Fetch fulfillment orders
  const foData = await client.request(FULFILLMENT_ORDERS_QUERY, { orderId: formattedOrderId }, { estimatedCost: 10 });
  const foEdges = foData?.order?.fulfillmentOrders?.edges || [];
  
  const openFos = foEdges
    .map(e => e.node)
    .filter(fo => fo.status === 'OPEN' || fo.status === 'IN_PROGRESS' || fo.status === 'SCHEDULED');

  if (!openFos.length) {
    throw new Error(`No open fulfillment orders found for order ${formattedOrderId} on Shopify`);
  }

  // Create a fast lookup map for packed line items if partial fulfillment
  const packedMap = new Map();
  if (Array.isArray(packedItems) && packedItems.length > 0) {
    for (const item of packedItems) {
      const pQty = parseInt(item.packed ?? item.qty, 10) || 0;
      if (item.sku) packedMap.set(String(item.sku).toLowerCase(), pQty);
      if (item.remote_id) packedMap.set(String(item.remote_id), pQty);
      if (item.id) packedMap.set(String(item.id), pQty);
    }
  }

  const lineItemsByFulfillmentOrder = [];
  for (const fo of openFos) {
    const foLineItems = (fo.lineItems?.edges || []).map(edge => {
      const edgeNode = edge.node;
      let fulfillQty = edgeNode.remainingQuantity || edgeNode.totalQuantity || 1;
      
      if (isPartial && packedMap.size > 0) {
        const matched = packedMap.get(String(edgeNode.id)) ?? 
                        packedMap.get(String(edgeNode.sku || '').toLowerCase());
        if (matched !== undefined) {
          fulfillQty = Math.min(fulfillQty, matched);
        }
      }

      return {
        id: edgeNode.id,
        quantity: fulfillQty
      };
    }).filter(item => item.quantity > 0);

    if (foLineItems.length > 0) {
      lineItemsByFulfillmentOrder.push({
        fulfillmentOrderId: fo.id,
        fulfillmentOrderLineItems: foLineItems
      });
    }
  }

  if (!lineItemsByFulfillmentOrder.length) {
    console.log(`[ShopifyPush] No open line items with quantity > 0 to fulfill for ${formattedOrderId}`);
    return { status: 'NO_ITEMS_TO_FULFILL', simulated: true };
  }

  const payload = {
    lineItemsByFulfillmentOrder,
    notifyCustomer: Boolean(notifyCustomer),
    trackingInfo: trackingNumber ? {
      company: trackingCompany,
      number: trackingNumber
    } : null
  };

  const res = await client.request(FULFILLMENT_CREATE_MUTATION, { fulfillment: payload }, { estimatedCost: 15 });
  const userErrors = res?.fulfillmentCreateV2?.userErrors || [];
  if (userErrors.length) {
    throw new Error(`Shopify fulfillment error: ${userErrors.map(e => e.message).join('; ')}`);
  }

  return res.fulfillmentCreateV2.fulfillment;
}

async function updateShopifyOrderDetails({ client, remoteOrderId, note, tags }) {
  if (isDemoOrLocal(remoteOrderId)) {
    console.log(`[ShopifyPush] Skipping remote order details update for demo/local order: ${remoteOrderId}`);
    return { id: remoteOrderId, simulated: true };
  }

  const formattedOrderId = formatShopifyGid(remoteOrderId, 'Order');
  const input = { id: formattedOrderId };
  if (note !== undefined) input.note = note;
  if (tags !== undefined) input.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());

  const res = await client.request(ORDER_UPDATE_MUTATION, { input }, { estimatedCost: 10 });
  const userErrors = res?.orderUpdate?.userErrors || [];
  if (userErrors.length) {
    throw new Error(`Shopify order update error: ${userErrors.map(e => e.message).join('; ')}`);
  }

  return res.orderUpdate.order;
}

const GET_VARIANT_INVENTORY_ITEM_QUERY = `
  query GetVariantInventoryItem($variantId: ID!) {
    productVariant(id: $variantId) {
      id
      inventoryItem {
        id
        inventoryLevels(first: 5) {
          edges {
            node {
              id
              location {
                id
              }
              quantities(names: ["available"]) {
                name
                quantity
              }
            }
          }
        }
      }
    }
  }
`;

const GET_STORE_LOCATIONS_QUERY = `
  query GetStoreLocations {
    locations(first: 5, includeInactive: false) {
      edges {
        node {
          id
          name
          isActive
        }
      }
    }
  }
`;

async function updateShopifyInventory({ client, remoteVariantId, newStock }) {
  if (isDemoOrLocal(remoteVariantId)) {
    console.log(`[ShopifyPush] Skipping remote inventory push for demo/local variant: ${remoteVariantId}`);
    return { id: remoteVariantId, simulated: true };
  }

  const formattedVariantId = formatShopifyGid(remoteVariantId, 'ProductVariant');
  
  try {
    const data = await client.request(GET_VARIANT_INVENTORY_ITEM_QUERY, { variantId: formattedVariantId }, { estimatedCost: 10 });
    const invItem = data?.productVariant?.inventoryItem;
    let locationId = invItem?.inventoryLevels?.edges?.[0]?.node?.location?.id;
    const invItemId = invItem?.id;

    if (!invItemId) {
      console.warn(`[ShopifyPush] InventoryItem not found for variant ${formattedVariantId}`);
      return { simulated: true, notFound: true };
    }

    if (!locationId) {
      // Fallback: Query primary active location for the shop
      const locData = await client.request(GET_STORE_LOCATIONS_QUERY, {}, { estimatedCost: 5 });
      const locEdges = locData?.locations?.edges || [];
      locationId = locEdges[0]?.node?.id;
    }

    if (!locationId) {
      console.warn(`[ShopifyPush] No active Shopify location found for store to update ${formattedVariantId}`);
      return { simulated: true, missingLocation: true };
    }

    const input = {
      name: 'available',
      reason: 'correction',
      ignoreCompareQuantity: true,
      quantities: [
        {
          inventoryItemId: invItemId,
          locationId: locationId,
          quantity: parseInt(newStock, 10) || 0
        }
      ]
    };

    const res = await client.request(INVENTORY_SET_MUTATION, { input }, { estimatedCost: 15 });
    const userErrors = res?.inventorySetQuantities?.userErrors || [];
    if (userErrors.length) {
      throw new Error(`Shopify inventory set error: ${userErrors.map(e => e.message).join('; ')}`);
    }

    return { success: true, newStock };
  } catch (err) {
    console.warn(`[ShopifyPush] Inventory sync warning for ${remoteVariantId}:`, err.message);
    throw err;
  }
}

module.exports = {
  fulfillShopifyOrder,
  updateShopifyOrderDetails,
  updateShopifyInventory
};
