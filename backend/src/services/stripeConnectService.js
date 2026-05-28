import Stripe from 'stripe';
import supabase from '../db/supabase.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', { apiVersion: '2023-10-16' });

export class StripeConnectService {
  async createConnectExpressAccount(userId, refreshUrl, returnUrl) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      capabilities: { transfers: { requested: true } },
      metadata: { userId }
    });

    await supabase.from('users').update({ stripe_connect_id: account.id }).eq('id', userId);

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding'
    });

    return { accountId: account.id, onboardingUrl: accountLink.url };
  }

  async createDirectCharge(sellerConnectId, amountCents, applicationFeeCents, currency = 'usd') {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      application_fee_amount: applicationFeeCents,
      transfer_data: { destination: sellerConnectId }
    });

    return { clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id };
  }
}

export const stripeConnectService = new StripeConnectService();
export default stripeConnectService;
