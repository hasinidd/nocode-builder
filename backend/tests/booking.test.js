import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const BASE = 'http://localhost:3000/api';
let token = '';
let agentId = '';
let slotId = '';
let bookingId = '';

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, body: await res.json() };
}

const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

before(async () => {
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.TEST_USER_EMAIL, password: process.env.TEST_USER_PASS })
  });
  const loginData = await loginRes.json();
  token = loginData.token;

  // Create a test agent
  const agentRes = await req('POST', '/agents', { name: 'Booking Test Agent', description: 'Test' });
  agentId = agentRes.body.id;
});

describe('Booking API', () => {

  describe('POST /bookings/slots — create slots', () => {
    it('creates a single slot and returns 201', async () => {
      const { status, body } = await req('POST', '/bookings/slots', {
        agentId,
        date: tomorrow,
        startTime: '09:00',
        endTime: '09:30'
      });
      assert.equal(status, 201);
      assert.equal(body.created, 1);
      assert.ok(body.slots[0].id);
      slotId = body.slots[0].id;
    });

    it('creates recurring slots for multiple weekdays over 4 weeks', async () => {
      const { status, body } = await req('POST', '/bookings/slots', {
        agentId,
        date: tomorrow,
        startTime: '10:00',
        endTime: '10:30',
        recurring: true,
        weekdays: [1, 3, 5]  // Monday, Wednesday, Friday
      });
      assert.equal(status, 201);
      assert.ok(body.created >= 3, 'should create at least 3 slots per week');
    });

    it('returns 400 when agentId is missing', async () => {
      const { status } = await req('POST', '/bookings/slots', { date: tomorrow, startTime: '11:00', endTime: '11:30' });
      assert.equal(status, 400);
    });
  });

  describe('GET /bookings/slots/:agentId — get slots', () => {
    it('returns slots for agent on given date', async () => {
      const { status, body } = await req('GET', `/bookings/slots/${agentId}?date=${tomorrow}`);
      assert.equal(status, 200);
      assert.ok(Array.isArray(body));
      assert.ok(body.every(s => s.hasOwnProperty('available')));
    });

    it('marks slot as available before booking', async () => {
      const { body } = await req('GET', `/bookings/slots/${agentId}?date=${tomorrow}`);
      const slot = body.find(s => s.id === slotId);
      assert.ok(slot, 'created slot should be in list');
      assert.equal(slot.available, true);
    });

    it('returns 400 when date param is missing', async () => {
      const { status } = await req('GET', `/bookings/slots/${agentId}`);
      assert.equal(status, 400);
    });
  });

  describe('POST /bookings — create booking', () => {
    it('creates booking and returns 201 with reference', async () => {
      const { status, body } = await req('POST', '/bookings', {
        agentId,
        slotId,
        customerName: 'Jane Doe',
        customerEmail: 'jane@example.com',
        customerPhone: '+94771234567',
        notes: 'First time customer'
      });
      assert.equal(status, 201);
      assert.ok(body.booking.id);
      assert.match(body.reference, /^BK-/);
      assert.equal(body.booking.customer_email, 'jane@example.com');
      bookingId = body.booking.id;
    });

    it('prevents double booking on same slot — returns 409', async () => {
      const { status, body } = await req('POST', '/bookings', {
        agentId,
        slotId,
        customerName: 'Bob Smith',
        customerEmail: 'bob@example.com'
      });
      assert.equal(status, 409);
      assert.match(body.error, /already booked/i);
    });

    it('marks slot as unavailable after booking', async () => {
      const { body } = await req('GET', `/bookings/slots/${agentId}?date=${tomorrow}`);
      const slot = body.find(s => s.id === slotId);
      assert.equal(slot.available, false);
    });

    it('returns 400 when customerEmail is missing', async () => {
      const { status } = await req('POST', '/bookings', { agentId, slotId: 'any', customerName: 'X' });
      assert.equal(status, 400);
    });
  });

  describe('GET /bookings/:agentId — list bookings', () => {
    it('returns paginated bookings for agent', async () => {
      const { status, body } = await req('GET', `/bookings/${agentId}?page=1&limit=10`);
      assert.equal(status, 200);
      assert.ok(Array.isArray(body.bookings));
      assert.ok(typeof body.total === 'number');
    });

    it('filters by status=confirmed', async () => {
      const { body } = await req('GET', `/bookings/${agentId}?status=confirmed`);
      assert.ok(body.bookings.every(b => b.status === 'confirmed'));
    });
  });

  describe('DELETE /bookings/:id — cancel booking', () => {
    it('cancels booking and returns success', async () => {
      const { status, body } = await req('DELETE', `/bookings/${bookingId}`, { reason: 'Customer request' });
      assert.equal(status, 200);
      assert.equal(body.success, true);
    });

    it('frees the slot after cancellation', async () => {
      const { body } = await req('GET', `/bookings/slots/${agentId}?date=${tomorrow}`);
      const slot = body.find(s => s.id === slotId);
      assert.equal(slot.available, true);
    });

    it('returns 400 when trying to cancel an already cancelled booking', async () => {
      const { status, body } = await req('DELETE', `/bookings/${bookingId}`, {});
      assert.equal(status, 400);
      assert.match(body.error, /already cancelled/i);
    });
  });
});
