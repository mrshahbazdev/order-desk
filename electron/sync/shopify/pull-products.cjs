const PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after, sortKey: UPDATED_AT, reverse: false) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        cursor
        node {
          id
          title
          vendor
          productType
          status
          tags
          updatedAt
          featuredImage {
            url
          }
          variants(first: 50) {
            edges {
              node {
                id
                title
                sku
                barcode
                price
                compareAtPrice
                inventoryQuantity
                image {
                  url
                }
                inventoryItem {
                  measurement {
                    weight {
                      value
                      unit
                    }
                  }
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

function normalizeShopifyProduct(storeId, node) {
  const product = {
    store_id: storeId,
    remote_id: node.id,
    title: node.title,
    vendor: node.vendor || '',
    type: node.productType || '',
    status: (node.status || 'ACTIVE').toLowerCase(),
    tags: Array.isArray(node.tags) ? node.tags.join(', ') : (node.tags || ''),
    image_url: node.featuredImage?.url || null,
    updated_at: node.updatedAt,
    raw: JSON.stringify(node)
  };

  const variants = (node.variants?.edges || []).map(edge => {
    const v = edge.node;
    const weightVal = v.inventoryItem?.measurement?.weight?.value;
    const weightUnit = v.inventoryItem?.measurement?.weight?.unit;
    let weight_g = 0;
    if (weightVal) {
      if (weightUnit === 'KILOGRAMS') weight_g = Math.round(weightVal * 1000);
      else if (weightUnit === 'POUNDS') weight_g = Math.round(weightVal * 453.592);
      else if (weightUnit === 'OUNCES') weight_g = Math.round(weightVal * 28.3495);
      else weight_g = Math.round(weightVal);
    }

    return {
      remote_id: v.id,
      sku: v.sku || '',
      barcode: v.barcode || '',
      title: v.title || '',
      price: toMinorUnits(v.price),
      compare_at: toMinorUnits(v.compareAtPrice),
      cost: 0,
      stock: v.inventoryQuantity || 0,
      weight_g,
      image_url: v.image?.url || null
    };
  });

  return { product, variants };
}

async function pullShopifyProducts({ client, storeId, db, onProgress }) {
  const syncRepo = db.sync;
  const productsRepo = db.products;

  let cursor = null;
  let hasNextPage = true;
  let totalProcessed = 0;

  while (hasNextPage) {
    const data = await client.request(PRODUCTS_QUERY, { first: 50, after: cursor }, { estimatedCost: 25 });
    const prodsData = data?.products;
    if (!prodsData) break;

    const edges = prodsData.edges || [];
    if (!edges.length) break;

    const normalizedList = edges.map(e => normalizeShopifyProduct(storeId, e.node));
    const saved = productsRepo.upsertPage(normalizedList);
    totalProcessed += saved;

    cursor = prodsData.pageInfo.endCursor;
    hasNextPage = prodsData.pageInfo.hasNextPage;

    if (onProgress) {
      onProgress({
        storeId,
        resource: 'products',
        processed: totalProcessed,
        hasNextPage
      });
    }

    if (!hasNextPage) break;
  }

  syncRepo.setState({
    store_id: storeId,
    resource: 'products',
    cursor: null,
    watermark: new Date().toISOString(),
    backfill_done: 1
  });

  syncRepo.log({
    store_id: storeId,
    resource: 'products',
    type: 'incremental',
    message: `Synced ${totalProcessed} Shopify products`,
    details: { totalProcessed }
  });

  return { totalProcessed };
}

module.exports = { pullShopifyProducts, normalizeShopifyProduct };
