const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class WooCommerceRESTClient {
  constructor({ domain, consumerKey, consumerSecret }) {
    let cleanUrl = domain.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    this.baseUrl = cleanUrl.replace(/\/+$/, '');
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
    this.authHeader = 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  }

  async request(path, options = {}, { retries = 3 } = {}) {
    const url = new URL(`${this.baseUrl}/wp-json/wc/v3/${path.replace(/^\//, '')}`);
    if (options.params) {
      for (const [k, v] of Object.entries(options.params)) {
        if (v !== undefined && v !== null) {
          url.searchParams.set(k, String(v));
        }
      }
    }

    try {
      const res = await fetch(url.toString(), {
        method: options.method || 'GET',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'OrderDesk-Desktop/1.0',
          ...(options.headers || {})
        },
        body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined
      });

      if (res.status === 401 || res.status === 403) {
        const err = new Error(`WooCommerce Authentication Failed (${res.status})`);
        err.authFailed = true;
        throw err;
      }

      if (res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504) {
        if (retries > 0) {
          console.warn(`[Woo REST] Server response ${res.status}. Retrying in 2s...`);
          await sleep(2000);
          return this.request(path, options, { retries: retries - 1 });
        }
        throw new Error(`WooCommerce server busy (${res.status})`);
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`WooCommerce REST HTTP error (${res.status}): ${text}`);
      }

      const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '1', 10);
      const totalCount = parseInt(res.headers.get('x-wp-total') || '0', 10);
      const linkHeader = res.headers.get('link');
      const data = await res.json();

      return {
        data,
        totalPages,
        totalCount,
        linkHeader
      };
    } catch (err) {
      if (retries > 0 && !err.authFailed) {
        console.warn(`[Woo REST] Network error, retrying (${retries} left):`, err.message);
        await sleep(1500);
        return this.request(path, options, { retries: retries - 1 });
      }
      throw err;
    }
  }

  async testConnection() {
    const res = await this.request('system_status', {}, { retries: 1 });
    return res.data?.environment || { status: 'ok' };
  }
}

module.exports = WooCommerceRESTClient;
