import fetch from 'node-fetch';

export class DeepgramService {
  constructor() {
    this.apiKey = process.env.DEEPGRAM_API_KEY;
  }

  async getTemporaryToken() {
    if (!this.apiKey) return { token: 'mock_deepgram_token', expires_in: 3600 };

    const response = await fetch('https://api.deepgram.com/v1/projects/keys', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        comment: 'Temporary client token',
        scopes: ['usage:write'],
        time_to_live_in_seconds: 3600
      })
    });

    if (!response.ok) {
      throw new Error(`Deepgram token error: ${response.statusText}`);
    }

    return await response.json();
  }

  async transcribeAudio(audioBuffer, options = {}) {
    if (!this.apiKey) {
      return { transcript: 'Sample audio transcription output', confidence: 0.98 };
    }

    const lang = options.language || 'en';
    const url = `https://api.deepgram.com/v1/listen?model=nova-2&language=${lang}&smart_format=true&punctuate=true`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.apiKey}`,
        'Content-Type': options.mimeType || 'audio/wav'
      },
      body: audioBuffer
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Deepgram API error');
    }

    const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    const confidence = data.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;

    return { transcript, confidence };
  }
}

export const deepgramService = new DeepgramService();
export default deepgramService;
