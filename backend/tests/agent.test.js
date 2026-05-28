import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const BASE = 'http://localhost:3000/api';
let token = '';
let agentId = '';

async function authPost(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  return { status: res.status, body: await res.json() };
}

async function authGet(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: res.status, body: await res.json() };
}

async function authPut(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  return { status: res.status, body: await res.json() };
}

async function authDelete(path) {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  return res.status;
}

before(async () => {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.TEST_USER_EMAIL, password: process.env.TEST_USER_PASS })
  });
  const data = await res.json();
  token = data.token;
  if (!token) throw new Error('Could not authenticate test user');
});

describe('Agent API', () => {

  describe('POST /agents — create agent', () => {
    it('creates agent with valid payload and returns 201', async () => {
      const { status, body } = await authPost('/agents', {
        name: 'Test Booking Agent',
        description: 'Handles hair salon bookings and appointment scheduling',
        language: 'en',
        tone: 'friendly',
        features: ['booking', 'services']
      });
      assert.equal(status, 201);
      assert.ok(body.id, 'agent id should be present');
      assert.equal(body.name, 'Test Booking Agent');
      assert.equal(body.published, false);
      assert.ok(body.system_prompt, 'system_prompt should be generated');
      agentId = body.id;
    });

    it('returns 400 when name is missing', async () => {
      const { status } = await authPost('/agents', { description: 'No name given' });
      assert.equal(status, 400);
    });

    it('returns 401 without auth token', async () => {
      const res = await fetch(`${BASE}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Unauthorized' })
      });
      assert.equal(res.status, 401);
    });
  });

  describe('GET /agents — list agents', () => {
    it('returns array of agents for current user', async () => {
      const { status, body } = await authGet('/agents');
      assert.equal(status, 200);
      assert.ok(Array.isArray(body.agents));
      assert.ok(typeof body.total === 'number');
    });

    it('supports search filter', async () => {
      const { body } = await authGet('/agents?search=Booking');
      assert.ok(body.agents.every(a => a.name.toLowerCase().includes('booking')));
    });

    it('supports pagination', async () => {
      const { body } = await authGet('/agents?page=1&limit=5');
      assert.ok(body.agents.length <= 5);
      assert.equal(body.limit, 5);
    });

    it('returns only unpublished when status=draft', async () => {
      const { body } = await authGet('/agents?status=draft');
      assert.ok(body.agents.every(a => !a.published));
    });
  });

  describe('GET /agents/:id — get single agent', () => {
    it('returns agent with knowledge_base when id is valid', async () => {
      const { status, body } = await authGet(`/agents/${agentId}`);
      assert.equal(status, 200);
      assert.equal(body.id, agentId);
      assert.ok(Array.isArray(body.knowledge_base));
    });

    it('returns 404 for unknown agent id', async () => {
      const { status } = await authGet('/agents/00000000-0000-0000-0000-000000000000');
      assert.equal(status, 404);
    });
  });

  describe('PUT /agents/:id — update agent', () => {
    it('updates name and returns updated agent', async () => {
      const { status, body } = await authPut(`/agents/${agentId}`, { name: 'Updated Agent Name' });
      assert.equal(status, 200);
      assert.equal(body.name, 'Updated Agent Name');
    });

    it('rebuilds system prompt when description changes', async () => {
      const before = (await authGet(`/agents/${agentId}`)).body.system_prompt;
      await authPut(`/agents/${agentId}`, { description: 'Brand new description for testing prompt rebuild' });
      const after = (await authGet(`/agents/${agentId}`)).body.system_prompt;
      assert.notEqual(before, after);
    });
  });

  describe('POST /agents/:id/publish — publish agent', () => {
    it('sets published=true and returns public_url and QR', async () => {
      const { status, body } = await authPost(`/agents/${agentId}/publish`, {});
      assert.equal(status, 200);
      assert.equal(body.agent.published, true);
      assert.ok(body.publicUrl.includes(agentId));
      assert.ok(body.qr.startsWith('data:image/png'));
    });

    it('GET /agents/:id/qr returns QR for published agent', async () => {
      const { status, body } = await authGet(`/agents/${agentId}/qr`);
      assert.equal(status, 200);
      assert.ok(body.qr.startsWith('data:image/png'));
    });
  });

  describe('POST /agents/:id/unpublish', () => {
    it('sets published=false and clears public_url', async () => {
      const { status, body } = await authPost(`/agents/${agentId}/unpublish`, {});
      assert.equal(status, 200);
      assert.equal(body.published, false);
      assert.equal(body.public_url, null);
    });
  });

  describe('POST /agents/:id/duplicate', () => {
    it('creates a copy of the agent with (copy) suffix', async () => {
      const { status, body } = await authPost(`/agents/${agentId}/duplicate`, {});
      assert.equal(status, 201);
      assert.match(body.name, /copy/i);
      assert.notEqual(body.id, agentId);
      assert.equal(body.published, false);
      // Clean up duplicate agent
      await authDelete(`/agents/${body.id}`);
    });
  });

  describe('DELETE /agents/:id — delete agent', () => {
    it('deletes agent and returns 204', async () => {
      const status = await authDelete(`/agents/${agentId}`);
      assert.equal(status, 204);
    });

    it('returns 404 for already deleted agent', async () => {
      const { status } = await authGet(`/agents/${agentId}`);
      assert.equal(status, 404);
    });
  });
});
