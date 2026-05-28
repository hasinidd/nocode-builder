import fetch from 'node-fetch';

export class EmailService {
  constructor() {
    this.apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.FROM_EMAIL || 'NoCode Builder <noreply@nocodebuilder.io>';
  }

  async sendEmail({ to, subject, html, text }) {
    if (!this.apiKey) {
      console.log(`[EmailService] (Dev mode) Email to ${to}: "${subject}"`);
      return { success: true, mock: true };
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Resend email dispatch failed');
    }
    return { success: true, id: data.id };
  }

  async sendWelcomeEmail(userEmail, userName) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to NoCode Builder, ${userName}!</h2>
        <p>You can now build, train, and deploy custom AI agents in minutes without writing code.</p>
        <a href="${process.env.CLIENT_URL || 'http://localhost:8080'}" style="background: #2563eb; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Dashboard</a>
      </div>
    `;
    return this.sendEmail({ to: userEmail, subject: 'Welcome to NoCode Builder', html });
  }

  async sendBookingConfirmation(customerEmail, bookingDetails) {
    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h3>Appointment Confirmed!</h3>
        <p>Reference: <strong>${bookingDetails.reference}</strong></p>
        <p>Date: ${bookingDetails.date}</p>
        <p>Time: ${bookingDetails.startTime} - ${bookingDetails.endTime}</p>
      </div>
    `;
    return this.sendEmail({ to: customerEmail, subject: `Booking Confirmation [${bookingDetails.reference}]`, html });
  }
}

export const emailService = new EmailService();
export default emailService;
