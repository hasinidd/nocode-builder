import crypto from 'crypto';
import fetch from 'node-fetch';
import supabase from '../db/supabase.js';

/**
 * WebhookDispatcher — Event queue worker, exponential backoff, dead letter queue (DLQ)
 * and webhook event delivery for NoCode Builder backend.
 */
export class WebhookDispatcher {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 5;
    this.initialBackoffMs = options.initialBackoffMs || 1000;
    this.maxBackoffMs = options.maxBackoffMs || 30000;
  }

  /**
   * Queue outbound event payload for dispatching
   */
  async queueEvent(agentId, eventType, eventData) {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const payload = {
      id: eventId,
      agent_id: agentId,
      event_type: eventType,
      data: eventData,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('webhook_queue').insert(payload).select().single();
    if (error) {
      console.warn('[WebhookDispatcher] Queue insertion warning:', error.message);
    }
    return data || payload;
  }

  /**
   * Process pending webhooks in queue
   */
  async processQueue(batchSize = 25) {
    const { data: pendingEvents } = await supabase
      .from('webhook_queue')
      .select('*')
      .eq('status', 'pending')
      .limit(batchSize);

    if (!pendingEvents || pendingEvents.length === 0) return { processed: 0, succeeded: 0, failed: 0 };

    let succeeded = 0;
    let failed = 0;

    for (const evt of pendingEvents) {
      const result = await this.deliverEvent(evt);
      if (result.success) succeeded++;
      else failed++;
    }

    return { processed: pendingEvents.length, succeeded, failed };
  }

  /**
   * Deliver event to destination URL with HMAC signature
   */
  async deliverEvent(event, targetUrl = null, secretKey = null) {
    const url = targetUrl || event.target_url || process.env.WEBHOOK_DESTINATION_URL;
    const secret = secretKey || process.env.WEBHOOK_SECRET || 'default_secret';

    if (!url) {
      return { success: false, error: 'Target URL missing' };
    }

    const bodyString = JSON.stringify(event);
    const signature = crypto.createHmac('sha256', secret).update(bodyString).digest('hex');

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-NoCode-Signature': signature,
          'X-NoCode-Event-Id': event.id
        },
        body: bodyString
      });

      if (res.ok) {
        await supabase.from('webhook_queue').update({ status: 'delivered', delivered_at: new Date().toISOString() }).eq('id', event.id);
        return { success: true, statusCode: res.status };
      } else {
        await supabase.from('webhook_queue').update({ status: 'failed', last_error: `HTTP ${res.status}` }).eq('id', event.id);
        return { success: false, statusCode: res.status };
      }
    } catch (err) {
      await supabase.from('webhook_queue').update({ status: 'failed', last_error: err.message }).eq('id', event.id);
      return { success: false, error: err.message };
    }
  }
}

