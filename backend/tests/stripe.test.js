import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StripeService } from '../src/services/stripeService.js';

describe('Stripe Subscription Integration', () => {
  const service = new StripeService();

  it('instantiates StripeService properly', () => {
    assert.ok(service);
    assert.equal(typeof service.createCheckoutSession, 'function');
  });

  it('throws error when creating portal session for user without customer id', async () => {
    await assert.rejects(
      async () => service.createCustomerPortalSession('non_existent_user', 'http://localhost/return'),
      /No active Stripe customer/i
    );
  });
});
