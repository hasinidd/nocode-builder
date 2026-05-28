import Stripe from 'stripe';
import supabase from '../db/supabase.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-10-16'
});

export class StripeService {
  async createCheckoutSession(userId, planId, successUrl, cancelUrl) {
    const { data: user, error } = await supabase
      .from('users')
      .select('email, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (error || !user) throw new Error('User not found');

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId }
      });
      customerId = customer.id;
      await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', userId);
    }

    const priceMap = {
      pro: process.env.STRIPE_PRICE_PRO_MONTHLY,
      business: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY
    };

    const priceId = priceMap[planId] || priceMap.pro;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: { userId, planId }
    });

    return { sessionId: session.id, url: session.url };
  }

  async createCustomerPortalSession(userId, returnUrl) {
    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!user?.stripe_customer_id) {
      throw new Error('No active Stripe customer profile found');
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: returnUrl
    });

    return { url: portalSession.url };
  }

  async handleWebhookEvent(event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata.userId;
        const planId = session.metadata.planId;
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_subscription_id: session.subscription,
          stripe_customer_id: session.customer,
          plan: planId,
          status: 'active',
          updated_at: new Date().toISOString()
        });
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await supabase.from('subscriptions').update({
          status: sub.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString()
        }).eq('stripe_subscription_id', sub.id);
        break;
      }
      default:
        break;
    }
  }
}

export const stripeService = new StripeService();
export default stripeService;
