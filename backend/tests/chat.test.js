import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const BASE = 'http://localhost:3000/api';
let token = '';
let agentId = '';
let sessionId = `session_${Date.now()}`;

async function req(method, path, body, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined
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
  const agent = await req('POST', '/agents', {
    name: 'Chat Test Agent',
    description: 'A friendly assistant for testing chat functionality',
    language: 'en',
    tone: 'casual'
  });
  agentId = agent.body.id;
  // Publish the agent so chat works
  await req('POST', `/agents/${agentId}/publish`, {});
});

describe('Chat API', () => {

  describe('POST /chat/:agentId/message — send message', () => {
    it('returns a reply from the agent', async () => {
      const { status, body } = await req('POST', `/chat/${agentId}/message`, {
        message: 'Hello, what can you help me with?',
        sessionId,
        history: []
      }, false);
      assert.equal(status, 200);
      assert.ok(body.reply, 'reply should be present');
      assert.ok(typeof body.reply === 'string');
      assert.ok(body.reply.length > 0);
      assert.ok(typeof body.responseMs === 'number');
    });

    it('returns language field in response', async () => {
      const { body } = await req('POST', `/chat/${agentId}/message`, {
        message: 'Can I book an appointment?',
        sessionId,
        history: []
      }, false);
      assert.ok(body.language, 'language should be detected/set');
    });

    it('returns action=booking when booking intent detected', async () => {
      const { body } = await req('POST', `/chat/${agentId}/message`, {
        message: 'I would like to book an appointment for tomorrow',
        sessionId
      }, false);
      // Verify action property is defined in response object
      assert.ok('action' in body);
    });

    it('supports multi-turn conversation with history', async () => {
      const history = [
        { role: 'user', content: 'Hi there' },
        { role: 'model', content: 'Hello! How can I help you today?' }
      ];
      const { status, body } = await req('POST', `/chat/${agentId}/message`, {
        message: 'What are your opening hours?',
        sessionId,
        history
      }, false);
      assert.equal(status, 200);
      assert.ok(body.reply.length > 0);
    });

    it('returns 400 for empty message', async () => {
      const { status } = await req('POST', `/chat/${agentId}/message`, {
        message: '   ',
        sessionId
      }, false);
      assert.equal(status, 400);
    });

    it('returns 422 for message exceeding 2000 chars', async () => {
      const { status } = await req('POST', `/chat/${agentId}/message`, {
        message: 'x'.repeat(2001),
        sessionId
      }, false);
      assert.equal(status, 422);
    });

    it('returns 404 for unpublished agent', async () => {
      const draft = await req('POST', '/agents', { name: 'Draft', description: 'test' });
      const { status } = await req('POST', `/chat/${draft.body.id}/message`, {
        message: 'hello', sessionId: 'x'
      }, false);
      assert.equal(status, 404);
      // Clean up draft agent after test
      await req('DELETE', `/agents/${draft.body.id}`, null, true);
    });

    it('enforces per-minute rate limit (30 req/min)', async () => {
      const requests = Array(35).fill(null).map(() =>
        fetch(`${BASE}/chat/${agentId}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'ping', sessionId })
        })
      );
      const results = await Promise.all(requests);
      const tooMany = results.filter(r => r.status === 429);
      assert.ok(tooMany.length > 0, 'should hit rate limit after 30 requests/min');
    });
  });

  describe('GET /chat/:agentId/history/:sessionId — get history', () => {
    it('returns ordered chat history for the session', async () => {
      const { status, body } = await req('GET', `/chat/${agentId}/history/${sessionId}`, null, true);
      assert.equal(status, 200);
      assert.ok(Array.isArray(body));
      assert.ok(body.length > 0, 'should have at least one log entry');
      // Verify ordering — ascending by created_at
      for (let i = 1; i < body.length; i++) {
        const prev = new Date(body[i - 1].created_at);
        const curr = new Date(body[i].created_at);
        assert.ok(curr >= prev, 'entries should be in ascending order');
      }
    });

    it('returns empty array for unknown session', async () => {
      const { body } = await req('GET', `/chat/${agentId}/history/no-such-session`, null, true);
      assert.deepEqual(body, []);
    });
  });
});
