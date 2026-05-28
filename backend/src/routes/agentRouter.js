import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import {
  createAgent, getAgents, getAgentById,
  updateAgent, deleteAgent, publishAgent, generateQR
} from '../controllers/agentController.js';

const router = express.Router();

router.use(authenticate);

router.get('/',         getAgents);
router.post('/',        createAgent);
router.get('/:id',      getAgentById);
router.put('/:id',      updateAgent);
router.delete('/:id',   deleteAgent);
router.post('/:id/publish', publishAgent);
router.get('/:id/qr',   generateQR);

export default router;
