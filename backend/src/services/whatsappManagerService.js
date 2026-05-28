import fetch from 'node-fetch';
import supabase from '../db/supabase.js';

export class WhatsAppManagerService {
  constructor() {
    this.graphUrl = 'https://graph.facebook.com/v19.0';
    this.accessToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
  }

  async createMessageTemplate(wabaId, templateData) {
    if (!this.accessToken) return { id: 'mock_template_id', status: 'APPROVED' };

    const url = `${this.graphUrl}/${wabaId}/message_templates`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: templateData.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        category: templateData.category || 'UTILITY',
        language: templateData.language || 'en_US',
        components: [
          { type: 'HEADER', format: 'TEXT', text: templateData.headerText || 'Notice' },
          { type: 'BODY', text: templateData.bodyText },
          { type: 'FOOTER', text: templateData.footerText || 'NoCode Builder' }
        ]
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'WhatsApp template creation failed');
    return data;
  }

  async sendInteractiveListMessage(toPhone, headerText, bodyText, buttonText, sections) {
    if (!this.accessToken) return { success: false, mock: true };

    const url = `${this.graphUrl}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: { type: 'text', text: headerText },
          body: { text: bodyText },
          action: {
            button: buttonText,
            sections
          }
        }
      })
    });

    return await res.json();
  }
}

export const whatsAppManagerService = new WhatsAppManagerService();
export default whatsAppManagerService;
