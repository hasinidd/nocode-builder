import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { createCheckout, createPortal, handleWebhook } from '../controllers/stripeController.js';

const router = express.Router();

router.post('/checkout', authenticate, createCheckout);
router.post('/portal',   authenticate, createPortal);
router.post('/webhook',  express.raw({ type: 'application/json' }), handleWebhook);

export default router;
