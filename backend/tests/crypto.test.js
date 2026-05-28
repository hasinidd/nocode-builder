import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encryptSecret, decryptSecret } from '../src/utils/crypto.js';

describe('AES-256 Field Encryption', () => {
  it('encrypts and decrypts sensitive strings correctly', () => {
    const secret = 'sk_test_51MzX900293847291039';
    const encrypted = encryptSecret(secret);
    assert.notEqual(secret, encrypted);
    const decrypted = decryptSecret(encrypted);
    assert.equal(secret, decrypted);
  });

  it('returns null for empty input', () => {
    assert.equal(encryptSecret(null), null);
    assert.equal(decryptSecret(null), null);
  });
});
