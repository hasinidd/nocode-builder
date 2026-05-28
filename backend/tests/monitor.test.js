import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const BASE = 'http://localhost:3000/api/monitor';
let token = '';
let agentId = '';

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, body: await res.json() };
}

before(async () => {
  const login = await fetch(`http://localhost:3000/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.TEST_USER_EMAIL, password: process.env.TEST_USER_PASS })
  });
  const data = await login.json();
  token = data.token;

  const agentRes = await fetch(`http://localhost:3000/api/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: 'Monitor Test Agent', description: 'Testing monitoring endpoints' })
  });
  const agent = await agentRes.json();
  agentId = agent.id;
});

describe('Monitor API', () => {

  describe('GET /monitor/:agentId/stats', () => {
    it('returns stats object with expected shape', async () => {
      const { status, body } = await req('GET', `/${agentId}/stats`);
      assert.equal(status, 200);
      assert.ok('totalMessages' in body, 'totalMessages must be present');
      assert.ok('successRate' in body, 'successRate must be present');
      assert.ok('avgResponseMs' in body, 'avgResponseMs must be present');
      assert.ok('actions' in body, 'actions must be present');
      assert.ok('booking' in body.actions);
      assert.ok('order' in body.actions);
      assert.ok('lead' in body.actions);
    });

    it('successRate is between 0 and 100', async () => {
      const { body } = await req('GET', `/${agentId}/stats`);
      const rate = parseFloat(body.successRate);
      assert.ok(rate >= 0 && rate <= 100, `successRate ${rate} out of range`);
    });

    it('accepts from/to date filters without error', async () => {
      const from = new Date(Date.now() - 7 * 86400000).toISOString();
      const to   = new Date().toISOString();
      const { status } = await req('GET', `/${agentId}/stats?from=${from}&to=${to}`);
      assert.equal(status, 200);
    });

    it('returns 401 without token', async () => {
      const res = await fetch(`${BASE}/${agentId}/stats`);
      assert.equal(res.status, 401);
    });
  });

  describe('GET /monitor/:agentId/logs', () => {
    it('returns logs with pagination metadata', async () => {
      const { status, body } = await req('GET', `/${agentId}/logs?page=1&limit=20`);
      assert.equal(status, 200);
      assert.ok(Array.isArray(body.logs));
      assert.ok(typeof body.total === 'number');
      assert.equal(body.page, 1);
      assert.equal(body.limit, 20);
    });

    it('each log entry has expected fields', async () => {
      const { body } = await req('GET', `/${agentId}/logs`);
      if (body.logs.length > 0) {
        const log = body.logs[0];
        assert.ok('id' in log);
        assert.ok('user_message' in log);
        assert.ok('success' in log);
        assert.ok('created_at' in log);
        assert.ok(!('agent_reply' in log) || typeof log.agent_reply === 'string' || log.agent_reply === null);
      }
    });

    it('filters by success=true', async () => {
      const { body } = await req('GET', `/${agentId}/logs?success=true`);
      assert.ok(body.logs.every(l => l.success === true));
    });

    it('filters by success=false', async () => {
      const { body } = await req('GET', `/${agentId}/logs?success=false`);
      assert.ok(body.logs.every(l => l.success === false));
    });

    it('filters by action type', async () => {
      const { body } = await req('GET', `/${agentId}/logs?action=booking`);
      assert.ok(body.logs.every(l => l.action_triggered === 'booking' || body.logs.length === 0));
    });
  });

  describe('GET /monitor/:agentId/volume', () => {
    it('returns array of daily volume entries', async () => {
      const { status, body } = await req('GET', `/${agentId}/volume?days=7`);
      assert.equal(status, 200);
      assert.ok(Array.isArray(body));
      if (body.length > 0) {
        const entry = body[0];
        assert.ok('date' in entry);
        assert.ok('total' in entry);
        assert.ok('success' in entry);
        assert.ok('failed' in entry);
      }
    });

    it('defaults to 30 days when days param is omitted', async () => {
      const { status } = await req('GET', `/${agentId}/volume`);
      assert.equal(status, 200);
    });
  });
});
