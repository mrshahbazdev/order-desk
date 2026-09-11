const ORDERS_QUERY = `
  query GetOrders($first: Int!, $after: String, $query: String) {
    orders(first: $first, after: $after, query: $query, sortKey: UPDATED_AT, reverse: false) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        cursor
        node {
          id
          name
          legacyResourceId
          createdAt
          updatedAt
          displayFinancialStatus
          displayFulfillmentStatus
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          subtotalPriceSet {
            shopMoney {
              amount
            }
          }
          totalShippingPriceSet {
            shopMoney {
              amount
            }
          }
          totalTaxSet {
            shopMoney {
              amount
            }
          }
          totalDiscountsSet {
            shopMoney {
              amount
            }
          }
          customer {
            id
            firstName
            lastName
            email
            phone
          }
          shippingAddress {
            name
            address1
            address2
            city
            province
            zip
            country
            phone
          }
          billingAddress {
            name
            address1
            address2
            city
            province
            zip
            country
            phone
          }
          tags
          note
          lineItems(first: 50) {
            edges {
              node {
                id
                title
                variantTitle
                sku
                quantity
                discountedUnitPriceSet {
                  shopMoney {
                    amount
                  }
                }
                discountedTotalSet {
                  shopMoney {
                    amount
                  }
                }
                image {
                  url
                }
              }
            }
          }
        }
      }
    }
  }
`;

function toMinorUnits(amountStr) {
  if (!amountStr) return 0;
  const num = parseFloat(amountStr);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

function normalizeShopifyOrder(storeId, node) {
  const shopMoney = node.totalPriceSet?.shopMoney;
  const currency = shopMoney?.currencyCode || 'PKR';
  const total = toMinorUnits(shopMoney?.amount);
  const subtotal = toMinorUnits(node.subtotalPriceSet?.shopMoney?.amount);
  const shipping = toMinorUnits(node.totalShippingPriceSet?.shopMoney?.amount);
  const tax = toMinorUnits(node.totalTaxSet?.shopMoney?.amount);
  const discount = toMinorUnits(node.totalDiscountsSet?.shopMoney?.amount);

  let fulfillment = 'unfulfilled';
  const fulStatus = (node.displayFulfillmentStatus || '').toUpperCase();
  if (fulStatus === 'FULFILLED') {
    fulfillment = 'fulfilled';
  } else if (fulStatus === 'PARTIALLY_FULFILLED' || fulStatus === 'PARTIAL') {
    fulfillment = 'partial';
  } else if (fulStatus === 'RESTOCKED') {
    fulfillment = 'restocked';
  } else {
    fulfillment = 'unfulfilled';
  }

  let financial = 'pending';
  const finStatus = (node.displayFinancialStatus || '').toUpperCase();
  if (finStatus === 'PAID') {
    financial = 'paid';
  } else if (finStatus === 'PARTIALLY_PAID') {
    financial = 'partially_paid';
  } else if (finStatus.includes('REFUND')) {
    financial = 'refunded';
  } else if (finStatus === 'VOIDED' || finStatus === 'EXPIRED') {
    financial = 'voided';
  } else {
    financial = 'pending';
  }

  const orderNum = parseInt(node.name ? node.name.replace(/[^0-9]/g, '') : '0', 10) || null;

  const order = {
    store_id: storeId,
    remote_id: node.id,
    name: node.name,
    number: orderNum,
    email: node.customer?.email || null,
    phone: node.shippingAddress?.phone || node.customer?.phone || null,
    financial,
    fulfillment,
    currency,
    subtotal,
    shipping,
    tax,
    discount,
    total,
    customer_json: node.customer ? JSON.stringify(node.customer) : null,
    ship_json: node.shippingAddress ? JSON.stringify(node.shippingAddress) : null,
    bill_json: node.billingAddress ? JSON.stringify(node.billingAddress) : null,
    tags: Array.isArray(node.tags) ? node.tags.join(', ') : (node.tags || ''),
    note: node.note || '',
    placed_at: node.createdAt,
    updated_at: node.updatedAt,
    raw: JSON.stringify(node)
  };

  const items = (node.lineItems?.edges || []).map(edge => {
    const itemNode = edge.node;
    const itemPrice = toMinorUnits(itemNode.discountedUnitPriceSet?.shopMoney?.amount);
    const itemTotal = toMinorUnits(itemNode.discountedTotalSet?.shopMoney?.amount) || (itemPrice * itemNode.quantity);

    return {
      remote_id: itemNode.id,
      sku: itemNode.sku || '',
      title: itemNode.title || '',
      variant: itemNode.variantTitle || '',
      qty: itemNode.quantity || 1,
      price: itemPrice,
      total: itemTotal,
      tax: 0,
      image_url: itemNode.image?.url || null
    };
  });

  return { order, items };
}

async function pullShopifyOrders({ client, storeId, db, onProgress }) {
  const syncRepo = db.sync;
  const ordersRepo = db.orders;

  const syncState = syncRepo.getState(storeId, 'orders') || {};
  const isBackfill = !syncState.backfill_done;
  let cursor = syncState.cursor || null;
  let watermark = syncState.watermark || null;

  let queryFilter = 'status:any';
  if (!isBackfill && watermark) {
    // 5-minute overlap window covers clock skew and in-flight writes
    const watermarkDate = new Date(new Date(watermark).getTime() - 5 * 60 * 1000);
    queryFilter = `status:any AND updated_at:>='${watermarkDate.toISOString()}'`;
  }

  const pageSize = 50;
  let hasNextPage = true;
  let totalProcessed = 0;
  let maxUpdatedAt = watermark;

  while (hasNextPage) {
    const variables = {
      first: pageSize,
      after: cursor,
      query: queryFilter || null
    };

    const data = await client.request(ORDERS_QUERY, variables, { estimatedCost: 20 });
    const ordersData = data?.orders;
    if (!ordersData) break;

    const edges = ordersData.edges || [];
    if (!edges.length) {
      hasNextPage = false;
      break;
    }

    const normalizedList = [];
    for (const edge of edges) {
      const node = edge.node;
      normalizedList.push(normalizeShopifyOrder(storeId, node));
      if (!maxUpdatedAt || new Date(node.updatedAt) > new Date(maxUpdatedAt)) {
        maxUpdatedAt = node.updatedAt;
      }
    }

    // Upsert transaction
    const saved = ordersRepo.upsertPage(normalizedList);
    totalProcessed += saved;

    cursor = ordersData.pageInfo.endCursor;
    hasNextPage = ordersData.pageInfo.hasNextPage;

    // Persist sync state after every page commit so crashes resume cleanly
    syncRepo.setState({
      store_id: storeId,
      resource: 'orders',
      cursor: hasNextPage ? cursor : null,
      watermark: maxUpdatedAt,
      backfill_done: isBackfill && !hasNextPage ? 1 : (isBackfill ? 0 : 1)
    });

    if (onProgress) {
      onProgress({
        storeId,
        resource: 'orders',
        processed: totalProcessed,
        hasNextPage,
        isBackfill
      });
    }

    if (!hasNextPage) break;
  }

  syncRepo.log({
    store_id: storeId,
    resource: 'orders',
    type: isBackfill ? 'backfill' : 'incremental',
    message: `Synced ${totalProcessed} Shopify orders successfully`,
    details: { totalProcessed, watermark: maxUpdatedAt }
  });

  return { totalProcessed, watermark: maxUpdatedAt };
}

module.exports = { pullShopifyOrders, normalizeShopifyOrder };
