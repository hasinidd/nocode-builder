import fetch from 'node-fetch';

export class ElevenLabsService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
  }

  async generateSpeech(text, voiceId = '21m00Tcm4TlvDq8ikWAM', stability = 0.5, similarity = 0.75) {
    if (!this.apiKey) {
      return { audioUrl: null, mock: true };
    }

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability, similarity_boost: similarity }
      })
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs TTS error ${response.status}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return { audioBuffer: Buffer.from(arrayBuffer), mimeType: 'audio/mpeg' };
  }

  async getVoices() {
    if (!this.apiKey) return [{ voice_id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' }];

    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': this.apiKey }
    });

    if (!res.ok) throw new Error('Could not fetch ElevenLabs voices');
    const data = await res.json();
    return data.voices || [];
  }
}

export const elevenLabsService = new ElevenLabsService();
export default elevenLabsService;
