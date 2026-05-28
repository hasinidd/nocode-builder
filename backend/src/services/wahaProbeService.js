import fetch from 'node-fetch';

export class WahaProbeService {
  constructor() {
    this.wahaUrl = process.env.WAHA_API_URL || 'http://localhost:3000';
    this.apiKey = process.env.WAHA_API_KEY;
  }

  async checkHealth() {
    try {
      const res = await fetch(`${this.wahaUrl}/api/health`, {
        headers: { 'X-Api-Key': this.apiKey || '' }
      });
      return { online: res.ok, status: res.status };
    } catch (err) {
      return { online: false, error: err.message };
    }
  }

  async getSessionStatus(sessionName = 'default') {
    try {
      const res = await fetch(`${this.wahaUrl}/api/sessions/${sessionName}`, {
        headers: { 'X-Api-Key': this.apiKey || '' }
      });
      if (!res.ok) return { status: 'STOPPED' };
      const data = await res.json();
      return data;
    } catch {
      return { status: 'DISCONNECTED' };
    }
  }

  async startSession(sessionName = 'default') {
    const res = await fetch(`${this.wahaUrl}/api/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': this.apiKey || '' },
      body: JSON.stringify({ name: sessionName })
    });
    return await res.json();
  }
}

export const wahaProbeService = new WahaProbeService();
export default wahaProbeService;
