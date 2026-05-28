import { GoogleCalendarService } from '../services/googleCalendarService.js';

export const createEvent = async (req, res, next) => {
  try {
    const { refreshToken, calendarId, event } = req.body;
    const gcal = new GoogleCalendarService(refreshToken);
    const result = await gcal.createCalendarEvent(calendarId, event);
    res.json(result);
  } catch (err) { next(err); }
};
