import { getHotelConfig } from "@/lib/hotelConfig";
import { supportTickets } from "@/lib/db";
import { sendEscalationEmail } from "@/lib/email";

export type EscalationReason =
  | "ai_flagged"
  | "ai_unclear"
  | "ai_error"
  | "guest_request"
  | "manual";

const UNCLEAR_REPLY_PATTERNS: RegExp[] = [
  /\bi (?:do not|don't) understand\b/i,
  /\bi'm not sure\b/i,
  /\bi am not sure\b/i,
  /\bcould you (?:clarify|repeat|rephrase)\b/i,
  /\bcan you (?:clarify|repeat|rephrase|say that again)\b/i,
  /\bi didn't (?:catch|understand|quite catch)\b/i,
  /\bnot sure what you (?:mean|said|are asking)\b/i,
  /\bhaving trouble understanding\b/i,
  /\b(?:message|request) (?:is|was|seems) unclear\b/i,
  /\bi(?:'m| am) unable to (?:help|assist|understand)\b/i,
  /\bi cannot (?:help|assist|answer)\b/i,
  /\bi can't (?:help|assist|answer)\b/i,
  /\bdon't have (?:that|this|enough) information\b/i,
  /\bnot (?:in|from) (?:our|the|my) (?:records|system|database)\b/i,
  /\blet me connect you (?:with|to)\b/i,
  /\b(?:speak|talk) (?:with|to) (?:a |our )?(?:staff|human|person|agent|representative|manager|front desk)\b/i,
];

export function replySuggestsEscalation(reply: string): boolean {
  const text = reply.trim();
  if (!text) return true;
  return UNCLEAR_REPLY_PATTERNS.some((pattern) => pattern.test(text));
}

export function resolveEscalation(rawReply: string): {
  reply: string;
  escalate: boolean;
  reason: EscalationReason;
} {
  const hasFlag = rawReply.includes("[ESCALATE]");
  const cleanText = rawReply.replace(/\[ESCALATE\]/g, "").trim();
  const unclear = replySuggestsEscalation(cleanText);

  if (hasFlag) {
    return { reply: cleanText, escalate: true, reason: "ai_flagged" };
  }
  if (unclear) {
    return { reply: cleanText, escalate: true, reason: "ai_unclear" };
  }
  return { reply: cleanText, escalate: false, reason: "ai_flagged" };
}

export function escalationReasonLabel(reason?: EscalationReason): string {
  switch (reason) {
    case "ai_unclear":
      return "AI could not understand the guest";
    case "ai_error":
      return "AI service error — staff handoff";
    case "guest_request":
      return "Guest requested a human";
    case "manual":
      return "Manual staff handoff";
    default:
      return "AI flagged for staff follow-up";
  }
}

export interface StaffHandoffInput {
  guestMessage: string;
  aiResponse: string;
  language: string;
  reason?: EscalationReason;
}

export async function notifyHotelStaff(input: StaffHandoffInput): Promise<string | undefined> {
  const config = getHotelConfig();
  const langCode = input.language || config.language || "en-US";

  try {
    const ticket = supportTickets.create({
      guestMessage: input.guestMessage,
      aiResponse: input.aiResponse,
      language: langCode,
      escalationReason: input.reason ?? "ai_flagged",
    });

    console.log(
      `[ESCALATION] Ticket ${ticket.id} (${input.reason ?? "ai_flagged"}): "${input.guestMessage.slice(0, 80)}..."`
    );

    await sendEscalationEmail({
      ticketId: ticket.id,
      guestMessage: input.guestMessage,
      aiResponse: input.aiResponse,
      language: langCode,
      hotelName: config.branding.hotelName,
      staffEmail: config.contact.email,
      reasonLabel: escalationReasonLabel(input.reason),
    }).catch((err) => console.error("[EMAIL] Failed to send escalation alert:", err));

    return ticket.id;
  } catch (e) {
    console.error("Failed to create support ticket:", e);
    return undefined;
  }
}
