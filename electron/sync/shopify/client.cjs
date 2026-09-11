const SHOPIFY_API_VERSION = '2026-01';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class ShopifyGraphQLClient {
  constructor({ domain, accessToken }) {
    // Normalise domain: my-store.myshopify.com
    let clean = (domain || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
    if (clean && !clean.includes('.')) {
      clean = `${clean}.myshopify.com`;
    }
    this.domain = clean;
    this.accessToken = (accessToken || '').trim();
    this.apiVersion = SHOPIFY_API_VERSION;
    this.endpoint = `https://${this.domain}/admin/api/${this.apiVersion}/graphql.json`;

    // Leaky bucket throttle state
    this.throttle = {
      maximumAvailable: 2000,
      currentlyAvailable: 2000,
      restoreRate: 100
    };
  }

  async request(query, variables = {}, { estimatedCost = 50, retries = 3 } = {}) {
    // Cost-aware leaky bucket throttle gate
    if (this.throttle.currentlyAvailable < estimatedCost) {
      const waitSeconds = Math.max(0.5, (estimatedCost - this.throttle.currentlyAvailable) / this.throttle.restoreRate);
      const waitMs = Math.ceil(waitSeconds * 1000 + 250);
      console.log(`[Shopify GraphQL] Throttle gate waiting ${waitMs}ms (${this.throttle.currentlyAvailable}/${estimatedCost} available)`);
      await sleep(waitMs);
    }

    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.accessToken,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ query, variables })
      });

      if (res.status === 401 || res.status === 403) {
        const err = new Error(`Shopify Authentication Failed (${res.status})`);
        err.authFailed = true;
        throw err;
      }

      if (res.status === 429) {
        if (retries > 0) {
          const retryAfter = parseFloat(res.headers.get('Retry-After') || '2');
          console.warn(`[Shopify GraphQL] 429 Throttled. Retrying in ${retryAfter}s...`);
          await sleep(retryAfter * 1000 + 500);
          return this.request(query, variables, { estimatedCost: estimatedCost * 2, retries: retries - 1 });
        }
        throw new Error('Shopify rate limit exceeded (429)');
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Shopify GraphQL HTTP error (${res.status}): ${text}`);
      }

      const json = await res.json();

      // Update throttle status from extensions.cost if returned
      if (json.extensions && json.extensions.cost) {
        const cost = json.extensions.cost;
        if (cost.throttleStatus) {
          this.throttle.currentlyAvailable = cost.throttleStatus.currentlyAvailable;
          this.throttle.restoreRate = cost.throttleStatus.restoreRate;
          this.throttle.maximumAvailable = cost.throttleStatus.maximumAvailable;
        }
      }

      if (json.errors && json.errors.length) {
        const isThrottled = json.errors.some(e => e.extensions && e.extensions.code === 'THROTTLED');
        if (isThrottled && retries > 0) {
          console.warn('[Shopify GraphQL] Query returned THROTTLED. Backing off 2s...');
          await sleep(2000);
          return this.request(query, variables, { estimatedCost: estimatedCost * 1.5, retries: retries - 1 });
        }
        throw new Error(`Shopify GraphQL errors: ${json.errors.map(e => e.message).join('; ')}`);
      }

      return json.data;
    } catch (err) {
      if (retries > 0 && !err.authFailed) {
        console.warn(`[Shopify GraphQL] Network error, retrying (${retries} left):`, err.message);
        await sleep(1500);
        return this.request(query, variables, { estimatedCost, retries: retries - 1 });
      }
      throw err;
    }
  }

  async testConnection() {
    const query = `
      query TestStore {
        shop {
          name
          myshopifyDomain
          currencyCode
          ianaTimezone
        }
      }
    `;
    const data = await this.request(query, {}, { estimatedCost: 1 });
    if (!data || !data.shop) {
      throw new Error('Shopify returned empty response. Please verify your shop domain and access token permissions.');
    }
    return data.shop;
  }
}

module.exports = ShopifyGraphQLClient;
