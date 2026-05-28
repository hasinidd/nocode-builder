import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { syncShopifyProducts } from '../controllers/shopifyController.js';

const router = express.Router();
router.post('/sync', authenticate, syncShopifyProducts);

export default router;
