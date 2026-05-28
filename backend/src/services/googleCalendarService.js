import fetch from 'node-fetch';

export class GoogleCalendarService {
  constructor(refreshToken) {
    this.refreshToken = refreshToken;
    this.clientId = process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  }

  async getAccessToken() {
    if (!this.refreshToken || !this.clientId) {
      return null;
    }

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token'
      })
    });

    const data = await res.json();
    return data.access_token;
  }

  async createCalendarEvent(calendarId, eventDetails) {
    const token = await this.getAccessToken();
    if (!token) return { success: false, mock: true };

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        summary: eventDetails.title,
        description: eventDetails.description,
        start: { dateTime: eventDetails.startTime, timeZone: 'UTC' },
        end: { dateTime: eventDetails.endTime, timeZone: 'UTC' },
        attendees: eventDetails.attendees ? eventDetails.attendees.map(email => ({ email })) : []
      })
    });

    const data = await response.json();
    return { success: response.ok, eventId: data.id, htmlLink: data.htmlLink };
  }

  async listBusySlots(calendarId, timeMin, timeMax) {
    const token = await this.getAccessToken();
    if (!token) return [];

    const url = 'https://www.googleapis.com/calendar/v3/freeBusy';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: calendarId }]
      })
    });

    const data = await response.json();
    return data.calendars?.[calendarId]?.busy || [];
  }
}

export const googleCalendarService = new GoogleCalendarService();
export default googleCalendarService;
