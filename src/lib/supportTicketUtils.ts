export interface SupportTicketRow {
  id: string;
  guest_message: string;
  ai_response: string;
  language: string;
  status: string;
  staff_reply: string | null;
  created_at: string;
  resolved_at: string | null;
  escalation_reason?: string | null;
}

export const LANG_NAMES: Record<string, string> = {
  "en-US": "English",
  "en-GB": "English (UK)",
  "ar-SA": "Arabic",
  "bn-BD": "Bengali",
  "zh-CN": "Chinese",
  "fr-FR": "French",
  "de-DE": "German",
  "hi-IN": "Hindi",
  "id-ID": "Indonesian",
  "it-IT": "Italian",
  "ja-JP": "Japanese",
  "ko-KR": "Korean",
  "ne-NP": "Nepali",
  "pt-BR": "Portuguese",
  "ru-RU": "Russian",
  "es-ES": "Spanish",
  "th-TH": "Thai",
  "tr-TR": "Turkish",
  "vi-VN": "Vietnamese",
};

export function getTicketAge(createdAt: string): string {
  const created = new Date(createdAt.includes("T") ? createdAt : `${createdAt}Z`);
  const diffMs = Date.now() - created.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export function getEscalationReasonLabel(reason?: string | null): string {
  switch (reason) {
    case "ai_unclear":
      return "AI could not understand";
    case "ai_error":
      return "AI service error";
    case "guest_request":
      return "Guest requested staff";
    case "manual":
      return "Manual handoff";
    case "ai_flagged":
      return "Needs staff follow-up";
    default:
      return "Ungenerated response";
  }
}

export function getTicketPriority(ticket: SupportTicketRow): { label: string; className: string } {
  const ageMs = Date.now() - new Date(ticket.created_at.includes("T") ? ticket.created_at : `${ticket.created_at}Z`).getTime();
  const ageHours = ageMs / 1000 / 60 / 60;
  const msg = ticket.guest_message.toLowerCase();

  if (msg.includes("emergency") || msg.includes("urgent") || msg.includes("danger")) {
    return { label: "Urgent", className: "bg-red-500/15 text-red-400 border-red-500/25" };
  }
  if (ticket.status === "open" && ageHours > 4) {
    return { label: "High", className: "bg-amber-500/15 text-amber-400 border-amber-500/25" };
  }
  if (ticket.status === "open" && ageHours > 1) {
    return { label: "Medium", className: "bg-yellow-500/15 text-yellow-500 border-yellow-500/25" };
  }
  return { label: "New", className: "bg-sky-500/15 text-sky-400 border-sky-500/25" };
}
