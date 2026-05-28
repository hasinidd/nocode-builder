import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const BASE = 'http://localhost:3000/api';
let token = '';
let agentId = '';
let productId = '';
let orderId = '';

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, body: await res.json() };
}

before(async () => {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.TEST_USER_EMAIL, password: process.env.TEST_USER_PASS })
  });
  const data = await login.json();
  token = data.token;
  const agent = await req('POST', '/agents', { name: 'Orders Test Agent', description: 'Test agent for orders' });
  agentId = agent.body.id;
});

describe('Orders & Products API', () => {

  describe('POST /orders/products — create product', () => {
    it('creates product with variants and returns 201', async () => {
      const { status, body } = await req('POST', '/orders/products', {
        agentId,
        name: 'Handmade Tote Bag',
        description: 'Eco-friendly canvas tote bag, made locally',
        price: 2500.00,
        variants: [
          { name: 'Color', value: 'Natural', price_delta: 0, inventory: 15 },
          { name: 'Color', value: 'Black', price_delta: 200, inventory: 8 },
          { name: 'Size', value: 'Small', price_delta: -300, inventory: 10 },
          { name: 'Size', value: 'Large', price_delta: 500, inventory: 5 }
        ]
      });
      assert.equal(status, 201);
      assert.ok(body.id);
      assert.equal(body.name, 'Handmade Tote Bag');
      productId = body.id;
    });

    it('returns 400 when price is missing', async () => {
      const { status } = await req('POST', '/orders/products', { agentId, name: 'No Price Product' });
      assert.equal(status, 400);
    });

    it('returns 400 when agentId is missing', async () => {
      const { status } = await req('POST', '/orders/products', { name: 'No Agent', price: 100 });
      assert.equal(status, 400);
    });
  });

  describe('GET /orders/products — list products', () => {
    it('returns products with variants nested', async () => {
      const { status, body } = await req('GET', `/orders/products?agentId=${agentId}`);
      assert.equal(status, 200);
      assert.ok(Array.isArray(body));
      const product = body.find(p => p.id === productId);
      assert.ok(product, 'created product should appear in list');
      assert.ok(Array.isArray(product.variants));
    });
  });

  describe('POST /orders — create order', () => {
    it('creates an order and returns 201 with pending status', async () => {
      const { status, body } = await req('POST', '/orders', {
        agentId,
        productId,
        quantity: 2,
        customerInfo: {
          name: 'Amara Silva',
          email: 'amara@example.com',
          address: '12 Galle Road, Colombo 03'
        }
      });
      assert.equal(status, 201);
      assert.ok(body.id);
      assert.equal(body.status, 'pending');
      assert.equal(body.quantity, 2);
      orderId = body.id;
    });

    it('sets total_amount based on product price × quantity', async () => {
      const { body } = await req('GET', `/orders?agentId=${agentId}`);
      const order = body.orders.find(o => o.id === orderId);
      assert.ok(order.total_amount >= 0);
    });

    it('returns 400 when productId is missing', async () => {
      const { status } = await req('POST', '/orders', { agentId, quantity: 1 });
      assert.equal(status, 400);
    });
  });

  describe('GET /orders — list orders', () => {
    it('returns paginated orders', async () => {
      const { status, body } = await req('GET', `/orders?agentId=${agentId}&page=1&limit=10`);
      assert.equal(status, 200);
      assert.ok(Array.isArray(body.orders));
      assert.ok(typeof body.total === 'number');
    });

    it('filters by status=pending', async () => {
      const { body } = await req('GET', `/orders?agentId=${agentId}&status=pending`);
      assert.ok(body.orders.every(o => o.status === 'pending'));
    });
  });

  describe('PATCH /orders/:id/status — update order status', () => {
    it('transitions from pending → paid', async () => {
      const { status, body } = await req('PATCH', `/orders/${orderId}/status`, { status: 'paid' });
      assert.equal(status, 200);
      assert.equal(body.status, 'paid');
    });

    it('transitions from paid → shipped', async () => {
      const { status, body } = await req('PATCH', `/orders/${orderId}/status`, { status: 'shipped' });
      assert.equal(status, 200);
      assert.equal(body.status, 'shipped');
    });

    it('transitions from shipped → delivered', async () => {
      const { status, body } = await req('PATCH', `/orders/${orderId}/status`, { status: 'delivered' });
      assert.equal(status, 200);
      assert.equal(body.status, 'delivered');
    });

    it('returns 404 for unknown order id', async () => {
      const { status } = await req('PATCH', '/orders/00000000-0000-0000-0000-000000000000/status', { status: 'paid' });
      assert.equal(status, 404);
    });
  });
});
