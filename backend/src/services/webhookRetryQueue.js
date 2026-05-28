import supabase from '../db/supabase.js';
import fetch from 'node-fetch';

export class WebhookRetryQueue {
  async processFailedWebhooks() {
    const { data: failed } = await supabase.from('webhook_deliveries').select('*').eq('success', false).lt('attempt', 3).limit(20);
    if (!failed || failed.length === 0) return { processed: 0 };

    let count = 0;
    for (const item of failed) {
      try {
        const res = await fetch(item.url, { method: 'POST', body: item.payload });
        if (res.ok) {
          await supabase.from('webhook_deliveries').update({ success: true }).eq('id', item.id);
          count++;
        }
      } catch {}
    }
    return { processed: count };
  }
}

export const webhookRetryQueue = new WebhookRetryQueue();
export default webhookRetryQueue;
