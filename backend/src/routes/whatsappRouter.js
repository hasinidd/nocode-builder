import express from 'express';
import { verifyWebhook, receiveMessage, sendWhatsAppText } from '../controllers/whatsappController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/webhook',  verifyWebhook);
router.post('/webhook', receiveMessage);
router.post('/send',    authenticate, sendWhatsAppText);

export default router;
