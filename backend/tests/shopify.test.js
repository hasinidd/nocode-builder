import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ShopifyService } from '../src/services/shopifyService.js';

describe('Shopify API Integration', () => {
  it('returns empty array when credentials missing', async () => {
    const shopify = new ShopifyService(null, null);
    const products = await shopify.fetchProducts();
    assert.deepEqual(products, []);
  });
});
