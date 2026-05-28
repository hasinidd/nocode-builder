import { followupEngineService } from '../services/followupEngineService.js';

export const schedule = async (req, res, next) => {
  try {
    const { agentId, customerEmail, customerPhone, sequenceType, delayHours } = req.body;
    const result = await followupEngineService.scheduleFollowup(agentId, customerEmail, customerPhone, sequenceType, delayHours);
    res.status(201).json(result);
  } catch (err) { next(err); }
};

export const triggerQueue = async (req, res, next) => {
  try {
    const result = await followupEngineService.processPendingFollowups();
    res.json(result);
  } catch (err) { next(err); }
};
