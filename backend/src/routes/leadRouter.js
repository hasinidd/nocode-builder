import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { getLeads, submitLead, deleteLead } from '../controllers/leadController.js';

const router = express.Router();

router.use(authenticate);
router.get('/:agentId', getLeads);
router.post('/',        submitLead);
router.delete('/:id',   deleteLead);

export default router;
