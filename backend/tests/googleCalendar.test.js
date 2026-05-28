import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GoogleCalendarService } from '../src/services/googleCalendarService.js';

describe('Google Calendar Integration', () => {
  it('returns null access token when refresh token missing', async () => {
    const gcal = new GoogleCalendarService(null);
    const token = await gcal.getAccessToken();
    assert.equal(token, null);
  });
});
