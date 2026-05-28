import fetch from 'node-fetch';

export class WooCommerceService {
  constructor(storeUrl, consumerKey, consumerSecret) {
    this.storeUrl = storeUrl ? storeUrl.replace(/\/+$/, '') : '';
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
  }

  async fetchProducts(page = 1, perPage = 50) {
    if (!this.storeUrl || !this.consumerKey) return [];

    const url = `${this.storeUrl}/wp-json/wc/v3/products?page=${page}&per_page=${perPage}&consumer_key=${this.consumerKey}&consumer_secret=${this.consumerSecret}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`WooCommerce API error ${res.status}`);
    return await res.json();
  }

  async createOrder(orderPayload) {
    if (!this.storeUrl) return { success: false, mock: true };

    const url = `${this.storeUrl}/wp-json/wc/v3/orders?consumer_key=${this.consumerKey}&consumer_secret=${this.consumerSecret}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });
    return await res.json();
  }
}

export const wooCommerceService = new WooCommerceService();
export default wooCommerceService;
