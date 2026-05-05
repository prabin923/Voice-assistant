import nodemailer from "nodemailer";

interface EscalationEmailData {
  ticketId: string;
  guestMessage: string;
  aiResponse: string;
  language: string;
  hotelName: string;
  staffEmail: string;
}

function getTransporter() {
  // Use configured SMTP or default to a "log only" mode
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null; // No SMTP configured — will log to console instead
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

/**
 * Escape HTML special characters to prevent XSS in email templates.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendEscalationEmail(data: EscalationEmailData): Promise<void> {
  const transporter = getTransporter();
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "ai-receptionist@hotel.local";

  // Sanitize all user-supplied content
  const safeHotelName = escapeHtml(data.hotelName);
  const safeTicketId = escapeHtml(data.ticketId);
  const safeGuestMessage = escapeHtml(data.guestMessage);
  const safeAiResponse = escapeHtml(data.aiResponse);
  const safeLanguage = escapeHtml(data.language);

  const subject = `🚨 [ESCALATION] Guest needs help — ${safeHotelName}`;
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #163a5f, #c9a227); padding: 20px 24px; border-radius: 16px 16px 0 0;">
        <h2 style="color: white; margin: 0; font-size: 18px;">🚨 Escalation Alert</h2>
        <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">${safeHotelName} AI Receptionist</p>
      </div>
      <div style="background: #1a1a1a; padding: 24px; border-radius: 0 0 16px 16px; color: #e5e5e5;">
        <p style="color: #a3a3a3; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Ticket ID</p>
        <p style="font-family: monospace; color: #e4c449; font-size: 14px; margin-bottom: 20px;">#${safeTicketId}</p>

        <p style="color: #a3a3a3; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Guest Message</p>
        <div style="background: #262626; padding: 16px; border-radius: 12px; border-left: 3px solid #c9a227; margin-bottom: 20px;">
          <p style="margin: 0; color: #fafafa; font-size: 14px; line-height: 1.6;">${safeGuestMessage}</p>
        </div>

        <p style="color: #a3a3a3; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">AI Response</p>
        <div style="background: #262626; padding: 16px; border-radius: 12px; border-left: 3px solid #1e5278; margin-bottom: 20px;">
          <p style="margin: 0; color: #d4d4d4; font-size: 14px; line-height: 1.6;">${safeAiResponse}</p>
        </div>

        <p style="color: #a3a3a3; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Language</p>
        <p style="color: #e5e5e5; font-size: 14px; margin-bottom: 20px;">${safeLanguage}</p>

        <hr style="border: none; border-top: 1px solid #333; margin: 20px 0;" />
        <p style="color: #737373; font-size: 12px; text-align: center;">
          This alert was sent by the ${safeHotelName} AI Receptionist.<br/>
          Please respond to the guest as soon as possible.
        </p>
      </div>
    </div>
  `;

  if (!transporter) {
    // No SMTP configured — log the escalation details
    console.log(`[EMAIL] Escalation alert (SMTP not configured):`);
    console.log(`  To: ${data.staffEmail}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Ticket: #${data.ticketId}`);
    console.log(`  Guest: "${data.guestMessage.slice(0, 100)}"`);
    return;
  }

  await transporter.sendMail({
    from: `"${data.hotelName} AI" <${fromEmail}>`,
    to: data.staffEmail,
    subject,
    html,
  });

  console.log(`[EMAIL] Escalation alert sent to ${data.staffEmail} for ticket #${data.ticketId}`);
}
