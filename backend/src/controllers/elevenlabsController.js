import { elevenLabsService } from '../services/elevenlabsService.js';

export const listVoices = async (req, res, next) => {
  try {
    const voices = await elevenLabsService.getVoices();
    res.json(voices);
  } catch (err) { next(err); }
};

export const synthesize = async (req, res, next) => {
  try {
    const { text, voiceId } = req.body;
    const result = await elevenLabsService.generateSpeech(text, voiceId);
    if (result.synthetic) return res.json(result);
    res.set('Content-Type', 'audio/mpeg');
    res.send(result.audioBuffer);
  } catch (err) { next(err); }
};
