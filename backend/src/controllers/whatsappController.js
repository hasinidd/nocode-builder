import { whatsAppService } from '../services/whatsappService.js';

export const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.status(403).send('Forbidden');
};

export const receiveMessage = async (req, res, next) => {
  try {
    const messageData = await whatsAppService.handleInboundWebhook(req.body);
    res.status(200).json({ status: 'processed', data: messageData });
  } catch (err) { next(err); }
};

export const sendWhatsAppText = async (req, res, next) => {
  try {
    const { to, text } = req.body;
    const result = await whatsAppService.sendMessage(to, text);
    res.json(result);
  } catch (err) { next(err); }
};
