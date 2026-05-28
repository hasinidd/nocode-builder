import express from 'express';
import { body, param } from 'express-validator';
import { sendMessage, getHistory } from '../controllers/chatController.js';
import { validate } from '../middlewares/validate.js';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

const chatLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: { error: 'Too many messages, slow down.' } });

router.post('/:agentId/message',
  chatLimiter,
  [
    param('agentId').isUUID(),
    body('message').notEmpty().isLength({ max: 2000 }),
    body('sessionId').notEmpty()
  ],
  validate,
  sendMessage
);

router.get('/:agentId/history/:sessionId',
  [param('agentId').isUUID(), param('sessionId').notEmpty()],
  validate,
  getHistory
);

export default router;
