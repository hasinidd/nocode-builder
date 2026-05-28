import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const BASE = 'http://localhost:3000/api/auth';
const TEST_EMAIL = `test_${Date.now()}@example.com`;
const TEST_PASS  = 'TestPassword@2026';
let accessToken  = '';
let refreshToken = '';

// ── Helpers ───────────────────────────────────────────────────────────────────
async function post(path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
  return { status: res.status, body: await res.json() };
}

async function get(path, token) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return { status: res.status, body: await res.json() };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('Auth API', () => {

  describe('POST /register', () => {
    it('returns 201 and token on valid registration', async () => {
      const { status, body } = await post('/register', { email: TEST_EMAIL, password: TEST_PASS, name: 'Test User' });
      assert.equal(status, 201);
      assert.ok(body.token, 'token should be present');
      assert.ok(body.refreshToken, 'refreshToken should be present');
      assert.equal(body.user.email, TEST_EMAIL);
      assert.equal(body.user.role, 'user');
      accessToken  = body.token;
      refreshToken = body.refreshToken;
    });

    it('returns 409 when email already registered', async () => {
      const { status, body } = await post('/register', { email: TEST_EMAIL, password: TEST_PASS, name: 'Dup' });
      assert.equal(status, 409);
      assert.match(body.error, /already registered/i);
    });

    it('returns 422 for invalid email', async () => {
      const { status } = await post('/register', { email: 'not-an-email', password: TEST_PASS, name: 'X' });
      assert.equal(status, 422);
    });

    it('returns 422 for short password', async () => {
      const { status } = await post('/register', { email: `short_${Date.now()}@x.com`, password: '123', name: 'X' });
      assert.equal(status, 422);
    });

    it('returns 422 when name is missing', async () => {
      const { status } = await post('/register', { email: `noname_${Date.now()}@x.com`, password: TEST_PASS });
      assert.equal(status, 422);
    });
  });

  describe('POST /login', () => {
    it('returns 200 and tokens on valid credentials', async () => {
      const { status, body } = await post('/login', { email: TEST_EMAIL, password: TEST_PASS });
      assert.equal(status, 200);
      assert.ok(body.token);
      assert.ok(body.refreshToken);
      assert.equal(body.user.email, TEST_EMAIL);
      accessToken  = body.token;
      refreshToken = body.refreshToken;
    });

    it('returns 401 for wrong password', async () => {
      const { status, body } = await post('/login', { email: TEST_EMAIL, password: 'WrongPass!99' });
      assert.equal(status, 401);
      assert.match(body.error, /invalid/i);
    });

    it('returns 401 for unregistered email', async () => {
      const { status, body } = await post('/login', { email: 'nobody@example.com', password: TEST_PASS });
      assert.equal(status, 401);
      assert.match(body.error, /invalid/i);
    });

    it('returns 422 for missing email field', async () => {
      const { status } = await post('/login', { password: TEST_PASS });
      assert.equal(status, 422);
    });

    it('returns a valid JWT with correct claims', async () => {
      const { body } = await post('/login', { email: TEST_EMAIL, password: TEST_PASS });
      const payload = jwt.decode(body.token);
      assert.ok(payload.id, 'id claim should exist');
      assert.equal(payload.email, TEST_EMAIL);
      assert.equal(payload.role, 'user');
      assert.ok(payload.exp > Math.floor(Date.now() / 1000), 'token should not be expired');
    });
  });

  describe('POST /refresh', () => {
    it('returns new tokens given a valid refresh token', async () => {
      const { status, body } = await post('/refresh', { refreshToken });
      assert.equal(status, 200);
      assert.ok(body.token);
      assert.ok(body.refreshToken);
      assert.notEqual(body.refreshToken, refreshToken, 'refresh token should be rotated');
      accessToken  = body.token;
      refreshToken = body.refreshToken;
    });

    it('returns 401 for a tampered refresh token', async () => {
      const { status, body } = await post('/refresh', { refreshToken: refreshToken + 'tampered' });
      assert.equal(status, 401);
      assert.match(body.error, /invalid/i);
    });

    it('returns 401 for a revoked (already-rotated) refresh token', async () => {
      const old = refreshToken;
      await post('/refresh', { refreshToken }); // rotate once
      const { status } = await post('/refresh', { refreshToken: old });
      assert.equal(status, 401);
    });

    it('returns 400 when refresh token field is missing', async () => {
      const { status } = await post('/refresh', {});
      assert.equal(status, 400);
    });
  });

  describe('GET /me', () => {
    it('returns current user profile with valid token', async () => {
      const { status, body } = await get('/me', accessToken);
      assert.equal(status, 200);
      assert.equal(body.email, TEST_EMAIL);
      assert.ok(body.id);
      assert.ok(!body.password_hash, 'password_hash must not be exposed');
    });

    it('returns 401 without token', async () => {
      const res = await fetch(`${BASE}/me`);
      assert.equal(res.status, 401);
    });

    it('returns 401 with expired/invalid token', async () => {
      const { status } = await get('/me', 'invalid.token.here');
      assert.equal(status, 401);
    });
  });

  describe('POST /change-password', () => {
    const newPass = 'NewTestPassword@2026';

    it('returns 200 when current password is correct', async () => {
      const { status, body } = await post('/change-password', { currentPassword: TEST_PASS, newPassword: newPass }, accessToken);
      assert.equal(status, 200);
      assert.match(body.message, /updated/i);
    });

    it('old password no longer works after change', async () => {
      const { status } = await post('/login', { email: TEST_EMAIL, password: TEST_PASS });
      assert.equal(status, 401);
    });

    it('new password works after change', async () => {
      const { status } = await post('/login', { email: TEST_EMAIL, password: newPass });
      assert.equal(status, 200);
    });
  });

  describe('POST /logout', () => {
    it('returns 200 and revokes refresh token', async () => {
      const { body: loginBody } = await post('/login', { email: TEST_EMAIL, password: 'NewTestPassword@2026' });
      const { status } = await post('/logout', {}, loginBody.token);
      assert.equal(status, 200);

      // Refresh token should now be invalid
      const { status: refreshStatus } = await post('/refresh', { refreshToken: loginBody.refreshToken });
      assert.equal(refreshStatus, 401);
    });
  });
});
