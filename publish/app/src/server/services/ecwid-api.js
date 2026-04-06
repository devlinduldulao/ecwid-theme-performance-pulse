/**
 * Ecwid REST API v3 Client
 *
 * Handles all communication with the Ecwid REST API including
 * pagination, rate limiting, and error handling.
 */

const BASE_URL = 'https://app.ecwid.com/api/v3';

/** Default delay (ms) between retries on 429 rate limit */
const RATE_LIMIT_INITIAL_DELAY = 1000;

/** Maximum number of retry attempts for rate-limited requests */
const MAX_RETRIES = 3;

class EcwidApi {
  /**
   * @param {string|number} storeId - Ecwid store ID
   * @param {string} token - API access token
   */
  constructor(storeId, token) {
    this.storeId = String(storeId);
    this.token = token;
    this.base = `${BASE_URL}/${this.storeId}`;
  }

  /**
   * Core HTTP request method with rate-limit retry logic.
   *
   * @param {string} endpoint - API endpoint path (e.g. `/products`)
   * @param {RequestInit} [options={}] - Fetch options
   * @returns {Promise<any>} Parsed JSON response or null for 204
   */
  async request(endpoint, options = {}) {
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${this.base}${endpoint}${separator}token=${this.token}`;

    let lastError;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
      });

      // Rate limited — wait and retry with exponential backoff
      if (response.status === 429 && attempt < MAX_RETRIES) {
        const delay = RATE_LIMIT_INITIAL_DELAY * Math.pow(2, attempt);
        console.warn(`Rate limited (429). Retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        lastError = new Error(`Ecwid API ${response.status}: ${errorBody}`);
        lastError.status = response.status;
        throw lastError;
      }

      if (response.status === 204) return null;
      return response.json();
    }

    throw lastError || new Error('Max retries exhausted');
  }

  // ─── Products ───────────────────────────────────────────

  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/products${query ? '?' + query : ''}`);
  }

  async getProduct(productId) {
    return this.request(`/products/${productId}`);
  }

  async createProduct(data) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(productId, data) {
    return this.request(`/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(productId) {
    return this.request(`/products/${productId}`, { method: 'DELETE' });
  }

  /**
   * Fetch ALL products using automatic pagination.
   * Ecwid limits responses to 100 items — this loops until all are fetched.
   *
   * @param {Record<string, string>} [params={}] - Additional query params
   * @returns {Promise<Array>} Complete list of products
   */
  async getAllProducts(params = {}) {
    const all = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await this.getProducts({ ...params, offset, limit });
      all.push(...(response.items || []));

      if (!response.items || response.items.length < limit) break;
      offset += limit;
    }

    return all;
  }

  // ─── Orders ─────────────────────────────────────────────

  async getOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/orders${query ? '?' + query : ''}`);
  }

  async getOrder(orderNumber) {
    return this.request(`/orders/${orderNumber}`);
  }

  async updateOrder(orderNumber, data) {
    return this.request(`/orders/${orderNumber}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getAllOrders(params = {}) {
    const all = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await this.getOrders({ ...params, offset, limit });
      all.push(...(response.items || []));

      if (!response.items || response.items.length < limit) break;
      offset += limit;
    }

    return all;
  }

  // ─── Customers ──────────────────────────────────────────

  async getCustomers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/customers${query ? '?' + query : ''}`);
  }

  async getCustomer(customerId) {
    return this.request(`/customers/${customerId}`);
  }

  async createCustomer(data) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomer(customerId, data) {
    return this.request(`/customers/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ─── Categories ─────────────────────────────────────────

  async getCategories(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/categories${query ? '?' + query : ''}`);
  }

  async getCategory(categoryId) {
    return this.request(`/categories/${categoryId}`);
  }

  // ─── Discount Coupons ───────────────────────────────────

  async getCoupons(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/discount_coupons${query ? '?' + query : ''}`);
  }

  async createCoupon(data) {
    return this.request('/discount_coupons', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ─── Store Profile ──────────────────────────────────────

  async getStoreProfile() {
    return this.request('/profile');
  }
}

module.exports = EcwidApi;
