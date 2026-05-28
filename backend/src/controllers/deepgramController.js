import { deepgramService } from '../services/deepgramService.js';

export const getToken = async (req, res, next) => {
  try {
    const data = await deepgramService.getTemporaryToken();
    res.json(data);
  } catch (err) { next(err); }
};

export const transcribe = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });
    const result = await deepgramService.transcribeAudio(req.file.buffer, { mimeType: req.file.mimetype });
    res.json(result);
  } catch (err) { next(err); }
};
