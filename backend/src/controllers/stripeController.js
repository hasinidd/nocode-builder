import { stripeService } from '../services/stripeService.js';

export const createCheckout = async (req, res, next) => {
  try {
    const { planId, successUrl, cancelUrl } = req.body;
    const session = await stripeService.createCheckoutSession(req.user.id, planId, successUrl, cancelUrl);
    res.json(session);
  } catch (err) { next(err); }
};

export const createPortal = async (req, res, next) => {
  try {
    const { returnUrl } = req.body;
    const session = await stripeService.createCustomerPortalSession(req.user.id, returnUrl);
    res.json(session);
  } catch (err) { next(err); }
};

export const handleWebhook = async (req, res, next) => {
  try {
    const sig = req.headers['stripe-signature'];
    await stripeService.handleWebhookEvent(req.body, sig);
    res.json({ received: true });
  } catch (err) { next(err); }
};
