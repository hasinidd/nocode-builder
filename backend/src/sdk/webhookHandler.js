import crypto from 'crypto';

/**
 * WebhookHandler — Verifies signature and parses inbound webhooks
 * for WhatsApp, Stripe, Twilio, Firecrawl, and custom client integrations.
 */
export class WebhookHandler {
  constructor(options = {}) {
    this.secrets = {
      whatsapp: options.whatsappAppSecret || process.env.WHATSAPP_APP_SECRET,
      stripe: options.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET,
      twilio: options.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN,
      custom: options.customSecret || process.env.WEBHOOK_SECRET
    };
  }

  verifySignature(rawBody, signatureHeader, secret, algorithm = 'sha256') {
    if (!signatureHeader || !secret) return false;
    try {
      const hmac = crypto.createHmac(algorithm, secret);
      hmac.update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody));
      const expected = hmac.digest('hex');
      const actual = signatureHeader.replace(/^(sha256=|v1=)/, '');
      return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'));
    } catch {
      return false;
    }
  }

  verifyWhatsApp(rawBody, signature) {
    return this.verifySignature(rawBody, signature, this.secrets.whatsapp, 'sha256');
  }

  verifyStripe(rawBody, signature) {
    if (!signature) return false;
    const parts = signature.split(',').reduce((acc, item) => {
      const [key, val] = item.split('=');
      acc[key] = val;
      return acc;
    }, {});
    if (!parts.t || !parts.v1) return false;
    const payload = `${parts.t}.${typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody)}`;
    return this.verifySignature(payload, parts.v1, this.secrets.stripe, 'sha256');
  }

  verifyTwilio(url, params, signature) {
    if (!signature || !this.secrets.twilio) return false;
    const data = Object.keys(params).sort().reduce((acc, k) => acc + k + params[k], url);
    const expected = crypto.createHmac('sha1', this.secrets.twilio).update(data).digest('base64');
    return expected === signature;
  }

  parseWhatsAppMessage(body) {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];
    const contact = value?.contacts?.[0];
    if (!message) return null;
    return {
      from: message.from,
      senderName: contact?.profile?.name || message.from,
      messageId: message.id,
      timestamp: message.timestamp,
      type: message.type,
      text: message.text?.body || '',
      mediaUrl: message.image?.id || message.document?.id || null
    };
  }

  parseStripeEvent(body) {
    return {
      id: body.id,
      type: body.type,
      data: body.data?.object,
      created: body.created
    };
  }

  middleware(provider = 'custom') {
    return (req, res, next) => {
      const signature = req.headers['x-signature'] || req.headers['stripe-signature'] || req.headers['x-hub-signature-256'];
      const rawBody = req.rawBody || req.body;
      const secret = this.secrets[provider];
      if (secret && !this.verifySignature(rawBody, signature, secret)) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
      next();
    };
  }
}

export default WebhookHandler;
