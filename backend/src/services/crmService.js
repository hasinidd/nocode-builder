import fetch from 'node-fetch';

export class CRMService {
  constructor() {
    this.hubspotKey = process.env.HUBSPOT_ACCESS_TOKEN;
  }

  async createHubSpotContact(email, firstName, lastName, phone = '') {
    if (!this.hubspotKey) {
      return { success: true, mock: true };
    }

    const url = 'https://api.hubapi.com/crm/v3/objects/contacts';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.hubspotKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: { email, firstname: firstName, lastname: lastName, phone }
      })
    });

    const data = await res.json();
    return { success: res.ok, id: data.id };
  }
}

export const crmService = new CRMService();
export default crmService;
