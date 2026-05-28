import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { scrapeUrl } from '../controllers/scrapeController.js';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate.js';

const router = express.Router();

router.post('/',
  authenticate,
  [body('url').isURL(), body('agentId').notEmpty()],
  validate,
  scrapeUrl
);

export default router;
