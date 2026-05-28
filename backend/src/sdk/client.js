import fetch from 'node-fetch';

/**
 * NoCodeBuilderClient — Official Node.js SDK for NoCode Builder API
 * Provides programmatic access to agent creation, chat streaming,
 * knowledge base ingestion, bookings, products, orders, and analytics.
 */
export class NoCodeBuilderClient {
  constructor(options = {}) {
    if (!options.apiKey && typeof process !== 'undefined') {
      options.apiKey = process.env.NOCODE_BUILDER_API_KEY || '';
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl || 'http://localhost:3000/api').replace(/\/+$/, '');
    this.timeout = options.timeout || 30000;
  }

  async _request(method, path, body = null, params = {}) {
    const url = new URL(`${this.baseUrl}${path}`);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
    });

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'NoCodeBuilder-NodeSDK/1.0.0'
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
        signal: controller.signal
      });

      clearTimeout(timer);

      if (response.status === 204) return null;

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }
      return data;
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms for ${method} ${path}`);
      }
      throw err;
    }
  }

  async register(email, password, name) {
    return this._request('POST', '/auth/register', { email, password, name });
  }

  async login(email, password) {
    const result = await this._request('POST', '/auth/login', { email, password });
    if (result.token) this.apiKey = result.token;
    return result;
  }

  async refresh(refreshToken) {
    return this._request('POST', '/auth/refresh', { refreshToken });
  }

  async getMe() {
    return this._request('GET', '/auth/me');
  }

  async listAgents(options = {}) {
    return this._request('GET', '/agents', null, options);
  }

  async getAgent(agentId) {
    return this._request('GET', `/agents/${agentId}`);
  }

  async createAgent(agentData) {
    return this._request('POST', '/agents', agentData);
  }

  async updateAgent(agentId, updates) {
    return this._request('PUT', `/agents/${agentId}`, updates);
  }

  async deleteAgent(agentId) {
    return this._request('DELETE', `/agents/${agentId}`);
  }

  async publishAgent(agentId) {
    return this._request('POST', `/agents/${agentId}/publish`);
  }

  async unpublishAgent(agentId) {
    return this._request('POST', `/agents/${agentId}/unpublish`);
  }

  async duplicateAgent(agentId) {
    return this._request('POST', `/agents/${agentId}/duplicate`);
  }

  async getQRCode(agentId) {
    return this._request('GET', `/agents/${agentId}/qr`);
  }

  async sendMessage(agentId, message, sessionId, history = []) {
    return this._request('POST', `/chat/${agentId}/message`, { message, sessionId, history });
  }

  async getChatHistory(agentId, sessionId) {
    return this._request('GET', `/chat/${agentId}/history/${sessionId}`);
  }

  async scrapeUrl(agentId, url) {
    return this._request('POST', '/scrape', { agentId, url });
  }

  async listSources(agentId) {
    return this._request('GET', `/scrape/sources/${agentId}`);
  }

  async deleteSource(agentId, sourceUrl) {
    return this._request('DELETE', `/scrape/source/${agentId}/${encodeURIComponent(sourceUrl)}`);
  }

  async getSlots(agentId, date, serviceId = null) {
    return this._request('GET', `/bookings/slots/${agentId}`, null, { date, serviceId });
  }

  async createBooking(bookingData) {
    return this._request('POST', '/bookings', bookingData);
  }

  async getBookings(agentId, options = {}) {
    return this._request('GET', `/bookings/${agentId}`, null, options);
  }

  async cancelBooking(bookingId, reason = '') {
    return this._request('DELETE', `/bookings/${bookingId}`, { reason });
  }

  async createSlots(slotData) {
    return this._request('POST', '/bookings/slots', slotData);
  }

  async listProducts(agentId) {
    return this._request('GET', '/orders/products', null, { agentId });
  }

  async createProduct(productData) {
    return this._request('POST', '/orders/products', productData);
  }

  async listOrders(agentId, options = {}) {
    return this._request('GET', '/orders', null, { agentId, ...options });
  }

  async createOrder(orderData) {
    return this._request('POST', '/orders', orderData);
  }

  async updateOrderStatus(orderId, status) {
    return this._request('PATCH', `/orders/${orderId}/status`, { status });
  }

  async getLeads(agentId) {
    return this._request('GET', `/leads/${agentId}`);
  }

  async submitLead(agentId, fields, sessionId) {
    return this._request('POST', '/leads', { agentId, fields, sessionId });
  }

  async deleteLead(leadId) {
    return this._request('DELETE', `/leads/${leadId}`);
  }

  async getStats(agentId, options = {}) {
    return this._request('GET', `/monitor/${agentId}/stats`, null, options);
  }

  async getLogs(agentId, options = {}) {
    return this._request('GET', `/monitor/${agentId}/logs`, null, options);
  }

  async getDailyVolume(agentId, days = 30) {
    return this._request('GET', `/monitor/${agentId}/volume`, null, { days });
  }
}

export default NoCodeBuilderClient;
