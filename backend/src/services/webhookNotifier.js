import crypto from 'crypto';
import fetch from 'node-fetch';
import supabase from '../db/supabase.js';

export class WebhookNotifier {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.timeout = options.timeout || 10000;
  }

  async dispatch(agentId, eventType, payload) {
    const { data: webhooks } = await supabase
      .from('agent_webhooks')
      .select('*')
      .eq('agent_id', agentId)
      .eq('active', true);

    if (!webhooks || webhooks.length === 0) return [];

    return Promise.all(
      webhooks.map(wh => this._sendEvent(wh, eventType, payload))
    );
  }

  async _sendEvent(webhook, eventType, payload, attempt = 1) {
    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      id: `evt_${Date.now()}`,
      event: eventType,
      agentId: webhook.agent_id,
      timestamp,
      data: payload
    });

    const signature = this._signPayload(body, webhook.secret, timestamp);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature-256': signature,
          'X-Timestamp': String(timestamp),
          'User-Agent': 'NoCodeBuilder-WebhookEngine/1.0'
        },
        body,
        signal: controller.signal
      });

      clearTimeout(timer);

      const success = response.ok;
      await this._logDelivery(webhook.id, eventType, response.status, success, attempt);

      if (!success && attempt < this.maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
        return this._sendEvent(webhook, eventType, payload, attempt + 1);
      }

      return { webhookId: webhook.id, success, status: response.status, attempt };
    } catch (err) {
      clearTimeout(timer);
      await this._logDelivery(webhook.id, eventType, 0, false, attempt, err.message);

      if (attempt < this.maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
        return this._sendEvent(webhook, eventType, payload, attempt + 1);
      }

      return { webhookId: webhook.id, success: false, error: err.message, attempt };
    }
  }

  _signPayload(payload, secret, timestamp) {
    if (!secret) return '';
    const toSign = `${timestamp}.${payload}`;
    return crypto.createHmac('sha256', secret).update(toSign).digest('hex');
  }

  async _logDelivery(webhookId, event, status, success, attempt, errorMsg = null) {
    try {
      await supabase.from('webhook_deliveries').insert({
        webhook_id: webhookId,
        event_type: event,
        status_code: status,
        success,
        attempt,
        error_message: errorMsg,
        created_at: new Date().toISOString()
      });
    } catch {
    }
  }
}

export const webhookNotifier = new WebhookNotifier();
export default webhookNotifier;
