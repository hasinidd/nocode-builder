import fetch from 'node-fetch';

export class SttTtsService {
  constructor(options = {}) {
    this.deepgramKey = options.deepgramKey || process.env.DEEPGRAM_API_KEY;
    this.elevenLabsKey = options.elevenLabsKey || process.env.ELEVENLABS_API_KEY;
    this.defaultVoiceId = options.voiceId || '21m00Tcm4TlvDq8ikWAM';
  }

  async transcribeAudio(audioBuffer, mimeType = 'audio/mp3', language = 'en') {
    if (!this.deepgramKey) {
      return { text: '[Transcribed text demo fallback]', confidence: 0.95 };
    }

    const url = `https://api.deepgram.com/v1/listen?model=nova-2&language=${language}&smart_format=true`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.deepgramKey}`,
        'Content-Type': mimeType
      },
      body: audioBuffer
    });

    if (!response.ok) {
      throw new Error(`Deepgram STT failed: ${response.statusText}`);
    }

    const data = await response.json();
    const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    const confidence = data.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;

    return { text: transcript, confidence };
  }

  async synthesizeSpeech(text, voiceId = null) {
    const targetVoice = voiceId || this.defaultVoiceId;

    if (!this.elevenLabsKey) {
      return { audioBuffer: Buffer.from(text), format: 'audio/mp3', synthetic: true };
    }

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${targetVoice}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': this.elevenLabsKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      })
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs TTS failed: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return { audioBuffer: Buffer.from(arrayBuffer), format: 'audio/mp3', synthetic: false };
  }
}

export const sttTtsService = new SttTtsService();
export default sttTtsService;
