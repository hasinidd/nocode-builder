import fetch from 'node-fetch';
import supabase from '../db/supabase.js';

export class ShopifyService {
  constructor(shopDomain, accessToken) {
    this.shopDomain = shopDomain;
    this.accessToken = accessToken;
  }

  async fetchProducts(limit = 50) {
    if (!this.shopDomain || !this.accessToken) {
      return [];
    }

    const url = `https://${this.shopDomain}/admin/api/2024-01/products.json?limit=${limit}`;
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': this.accessToken,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Shopify API error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.products || [];
  }

  async syncProductsToAgent(agentId) {
    const products = await this.fetchProducts(100);
    const formatted = products.map(p => ({
      agent_id: agentId,
      name: p.title,
      description: p.body_html?.replace(/<[^>]*>?/gm, '') || p.title,
      price: p.variants?.[0]?.price ? parseFloat(p.variants[0].price) : 0,
      inventory: p.variants?.[0]?.inventory_quantity || 0
    }));

    if (formatted.length > 0) {
      await supabase.from('products').upsert(formatted, { onConflict: 'agent_id, name' });
    }

    return { synced: formatted.length };
  }

  async createWebhooks(callbackUrl) {
    const topics = ['products/create', 'products/update', 'orders/create'];
    for (const topic of topics) {
      await fetch(`https://${this.shopDomain}/admin/api/2024-01/webhooks.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhook: { topic, address: `${callbackUrl}?topic=${topic}`, format: 'json' }
        })
      });
    }
  }
}

export const shopifyService = new ShopifyService();
export default shopifyService;
