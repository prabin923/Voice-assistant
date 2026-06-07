import nodemailer from "nodemailer";

interface EscalationEmailData {
  ticketId: string;
  guestMessage: string;
  aiResponse: string;
  language: string;
  hotelName: string;
  staffEmail: string;
  reasonLabel?: string;
}

interface PasswordResetEmailData {
  toEmail: string;
  hotelName: string;
  resetUrl: string;
}

export interface BookingConfirmationEmailData {
  toEmail: string;
  hotelName: string;
  booking: {
    id: string;
    roomType: string;
    checkIn: string;
    checkOut: string;
    rooms: number;
    guestName: string;
    status: string;
  };
}

export function bookingRowToEmailPayload(row: {
  id: string;
  room_type: string;
  check_in: string;
  check_out: string;
  rooms: number;
  guest_name: string;
  status: string;
}): BookingConfirmationEmailData["booking"] {
  return {
    id: row.id,
    roomType: row.room_type,
    checkIn: row.check_in,
    checkOut: row.check_out,
    rooms: row.rooms,
    guestName: row.guest_name,
    status: row.status,
  };
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
  const safeReason = escapeHtml(data.reasonLabel || "AI flagged for staff follow-up");

  const subject = `🚨 [STAFF HANDOFF] Guest needs help — ${safeHotelName}`;
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #163a5f, #c9a227); padding: 20px 24px; border-radius: 16px 16px 0 0;">
        <h2 style="color: white; margin: 0; font-size: 18px;">🚨 Escalation Alert</h2>
        <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">${safeHotelName} AI Receptionist</p>
      </div>
      <div style="background: #1a1a1a; padding: 24px; border-radius: 0 0 16px 16px; color: #e5e5e5;">
        <p style="color: #a3a3a3; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Ticket ID</p>
        <p style="font-family: monospace; color: #e4c449; font-size: 14px; margin-bottom: 20px;">#${safeTicketId}</p>

        <p style="color: #a3a3a3; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Reason</p>
        <p style="color: #fbbf24; font-size: 14px; margin-bottom: 20px; font-weight: 600;">${safeReason}</p>
        <p style="color: #737373; font-size: 12px; margin: -12px 0 20px;">Please take over this conversation in the Support Inbox after the AI reply.</p>

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

export interface StaffBookingCompleteEmailData {
  staffEmail: string;
  hotelName: string;
  action: "confirmed" | "modified" | "cancelled";
  booking: BookingConfirmationEmailData["booking"] & {
    guestPhone?: string | null;
    guestEmail?: string | null;
  };
  guestMessage?: string;
}

export async function sendStaffBookingCompleteEmail(data: StaffBookingCompleteEmailData): Promise<void> {
  const transporter = getTransporter();
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "ai-receptionist@hotel.local";
  const safeHotelName = escapeHtml(data.hotelName);
  const shortId = escapeHtml(data.booking.id.slice(0, 8).toUpperCase());
  const safeGuest = escapeHtml(data.booking.guestName);
  const safeRoom = escapeHtml(data.booking.roomType);
  const actionLabel =
    data.action === "confirmed"
      ? "New booking — no action needed"
      : data.action === "modified"
        ? "Booking updated — no action needed"
        : "Booking cancelled — FYI only";

  const subject = `✅ ${actionLabel} — ${data.hotelName} (#${data.booking.id.slice(0, 8).toUpperCase()})`;
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #163a5f, #2d6a4f); padding: 18px 22px; border-radius: 14px 14px 0 0;">
        <h2 style="color: #fff; margin: 0; font-size: 18px;">${escapeHtml(actionLabel)}</h2>
        <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 13px;">${safeHotelName} AI Concierge</p>
      </div>
      <div style="background: #1a1a1a; border-radius: 0 0 14px 14px; padding: 22px; color: #e5e5e5;">
        <p style="font-family: monospace; color: #86efac; font-size: 14px;">#${shortId}</p>
        <ul style="line-height: 1.8; padding-left: 18px;">
          <li><strong>Guest:</strong> ${safeGuest}</li>
          <li><strong>Room:</strong> ${safeRoom} (${data.booking.rooms} room${data.booking.rooms === 1 ? "" : "s"})</li>
          <li><strong>Check-in:</strong> ${escapeHtml(data.booking.checkIn)}</li>
          <li><strong>Check-out:</strong> ${escapeHtml(data.booking.checkOut)}</li>
          <li><strong>Phone:</strong> ${escapeHtml(data.booking.guestPhone || "—")}</li>
          <li><strong>Email:</strong> ${escapeHtml(data.booking.guestEmail || "—")}</li>
          <li><strong>Status:</strong> ${escapeHtml(data.booking.status)}</li>
        </ul>
        ${
          data.guestMessage
            ? `<p style="color: #a3a3a3; font-size: 12px;">Guest request: ${escapeHtml(data.guestMessage.slice(0, 300))}</p>`
            : ""
        }
        <p style="color: #737373; font-size: 12px; margin-bottom: 0;">This is an informational notice only — no support ticket was created.</p>
      </div>
    </div>
  `;

  if (!transporter) {
    console.log("[EMAIL] Staff booking FYI (SMTP not configured):");
    console.log(`  To: ${data.staffEmail}`);
    console.log(`  Subject: ${subject}`);
    return;
  }

  await transporter.sendMail({
    from: `"${data.hotelName} AI" <${fromEmail}>`,
    to: data.staffEmail,
    subject,
    html,
  });
}

export async function sendBookingConfirmationEmail(data: BookingConfirmationEmailData): Promise<void> {
  const transporter = getTransporter();
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "ai-receptionist@hotel.local";
  const safeHotelName = escapeHtml(data.hotelName);
  const shortId = escapeHtml(data.booking.id.slice(0, 8).toUpperCase());
  const safeGuest = escapeHtml(data.booking.guestName);
  const safeRoom = escapeHtml(data.booking.roomType);
  const safeCheckIn = escapeHtml(data.booking.checkIn);
  const safeCheckOut = escapeHtml(data.booking.checkOut);

  const subject = `Booking confirmed — ${data.hotelName} (#${data.booking.id.slice(0, 8).toUpperCase()})`;
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #163a5f, #c9a227); padding: 18px 22px; border-radius: 14px 14px 0 0;">
        <h2 style="color: #fff; margin: 0; font-size: 18px;">Booking Confirmed</h2>
        <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 13px;">${safeHotelName}</p>
      </div>
      <div style="background: #1a1a1a; border-radius: 0 0 14px 14px; padding: 22px; color: #e5e5e5;">
        <p style="margin-top: 0;">Hi ${safeGuest}, your stay is confirmed.</p>
        <p style="font-family: monospace; color: #e4c449; font-size: 14px;">Confirmation #${shortId}</p>
        <ul style="line-height: 1.8; padding-left: 18px;">
          <li><strong>Room:</strong> ${safeRoom} (${data.booking.rooms} room${data.booking.rooms === 1 ? "" : "s"})</li>
          <li><strong>Check-in:</strong> ${safeCheckIn}</li>
          <li><strong>Check-out:</strong> ${safeCheckOut}</li>
        </ul>
        <p style="color: #a3a3a3; font-size: 12px;">Need changes? Reply to this email or contact the front desk.</p>
      </div>
    </div>
  `;

  if (!transporter) {
    console.log("[EMAIL] Booking confirmation (SMTP not configured):");
    console.log(`  To: ${data.toEmail}`);
    console.log(`  Subject: ${subject}`);
    return;
  }

  await transporter.sendMail({
    from: `"${data.hotelName}" <${fromEmail}>`,
    to: data.toEmail,
    subject,
    html,
  });
}

export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void> {
  const transporter = getTransporter();
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "ai-receptionist@hotel.local";
  const safeHotelName = escapeHtml(data.hotelName);
  const safeResetUrl = escapeHtml(data.resetUrl);

  const subject = `Reset your ${safeHotelName} admin password`;
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #163a5f, #c9a227); padding: 18px 22px; border-radius: 14px 14px 0 0;">
        <h2 style="color: #fff; margin: 0; font-size: 18px;">Password Reset Request</h2>
      </div>
      <div style="background: #1a1a1a; border-radius: 0 0 14px 14px; padding: 22px; color: #e5e5e5;">
        <p style="margin-top: 0; line-height: 1.6;">We received a request to reset your admin password for <strong>${safeHotelName}</strong>.</p>
        <p style="line-height: 1.6;">This link expires in 30 minutes and can only be used once.</p>
        <p style="margin: 22px 0;">
          <a href="${safeResetUrl}" style="display: inline-block; background: #163a5f; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 10px; font-weight: 600;">
            Reset Password
          </a>
        </p>
        <p style="line-height: 1.5; color: #a3a3a3;">If you did not request this, you can ignore this email.</p>
      </div>
    </div>
  `;

  if (!transporter) {
    console.log("[EMAIL] Password reset (SMTP not configured):");
    console.log(`  To: ${data.toEmail}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Reset URL: ${data.resetUrl}`);
    return;
  }

  await transporter.sendMail({
    from: `"${data.hotelName} AI" <${fromEmail}>`,
    to: data.toEmail,
    subject,
    html,
  });
}
