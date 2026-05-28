import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { WebhookHandler } from '../../src/sdk/webhookHandler.js';

describe('Webhook Signature Verification', () => {
  const handler = new WebhookHandler({ customSecret: 'my_secret_key' });

  it('verifies valid HMAC-SHA256 signature', () => {
    const body = JSON.stringify({ event: 'agent.published', id: '123' });
    const sig = crypto.createHmac('sha256', 'my_secret_key').update(body).digest('hex');

    const isValid = handler.verifySignature(body, sig, 'my_secret_key');
    assert.equal(isValid, true);
  });

  it('rejects invalid signature', () => {
    const body = JSON.stringify({ event: 'agent.published' });
    const isValid = handler.verifySignature(body, 'bad_sig', 'my_secret_key');
    assert.equal(isValid, false);
  });
});
