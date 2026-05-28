import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { claimAgentService } from '../services/claimAgentService.js';

const router = express.Router();
router.post('/claim', authenticate, async (req, res, next) => {
  try {
    const { claimToken } = req.body;
    const agent = await claimAgentService.claimPendingAgent(claimToken, req.user.id);
    res.json(agent);
  } catch (err) { next(err); }
});

export default router;
