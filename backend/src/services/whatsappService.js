import fetch from 'node-fetch';
import supabase from '../db/supabase.js';

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';

export class WhatsAppService {
  constructor() {
    this.token = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
    this.phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  }

  async sendMessage(toPhoneNumber, messageText) {
    if (!this.token || !this.phoneId) {
      console.warn('[WhatsAppService] Tokens not configured, skipping send');
      return { success: false, mock: true };
    }

    const url = `${GRAPH_API_BASE}/${this.phoneId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toPhoneNumber,
        type: 'text',
        text: { preview_url: false, body: messageText }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `WhatsApp API error ${response.status}`);
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  }

  async sendTemplateMessage(toPhoneNumber, templateName, languageCode = 'en', components = []) {
    const url = `${GRAPH_API_BASE}/${this.phoneId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toPhoneNumber,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components
        }
      })
    });

    const data = await response.json();
    return { success: response.ok, messageId: data.messages?.[0]?.id };
  }

  async handleInboundWebhook(payload) {
    const value = payload.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    if (!message) return null;

    const from = message.from;
    const text = message.text?.body || '';

    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('whatsapp_phone', value.metadata?.display_phone_number)
      .single();

    return { from, text, agentId: agent?.id || null };
  }
}

export const whatsAppService = new WhatsAppService();
export default whatsAppService;
