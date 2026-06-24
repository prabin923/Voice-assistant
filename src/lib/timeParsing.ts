import type { ChatHistoryMessage } from "@/lib/dateParsing";

function conversationText(message: string, history: ChatHistoryMessage[]): string {
  // Guest-authored text only — the assistant's prompts may contain example
  // times that would otherwise be misread as the guest's requested time.
  const userHistory = history.filter((h) => h.role === "user");
  return `${userHistory.map((h) => h.content).join(" ")} ${message}`;
}

/** Parse a single reservation time like "7pm", "7:30 PM", or "19:00". */
export function detectReservationTime(message: string, history: ChatHistoryMessage[] = []): string | null {
  const source = conversationText(message, history);

  const colonMatch = source.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i);
  if (colonMatch) {
    let hour = Number(colonMatch[1]);
    const minute = colonMatch[2];
    const meridiem = colonMatch[3]?.toLowerCase();
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    if (!meridiem && hour <= 12) {
      // Assume evening for dining when ambiguous
      if (hour < 11) hour += 12;
    }
    return `${String(hour).padStart(2, "0")}:${minute}`;
  }

  const simpleMatch = source.match(/\b(\d{1,2})\s*(am|pm)\b/i);
  if (simpleMatch) {
    let hour = Number(simpleMatch[1]);
    const meridiem = simpleMatch[2].toLowerCase();
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:00`;
  }

  const twentyFour = source.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (twentyFour) {
    return `${twentyFour[1].padStart(2, "0")}:${twentyFour[2]}`;
  }

  return null;
}

export function formatReservationTime(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const meridiem = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${meridiem}`;
}

export function detectPartySize(message: string, history: ChatHistoryMessage[] = []): number {
  const source = conversationText(message, history);
  const patterns = [
    /\b(?:table for|party of|for)\s+(\d+)\b/i,
    /\b(\d+)\s*(?:people|guests?|persons?|diners?|pax)\b/i,
    /\b(\d+)\s*(?:at|for)\s+(?:dinner|lunch|breakfast)\b/i,
    /\b(?:group of|group)\s+(\d+)\b/i,
    /\b(\d+)\s*(?:of us|in our group)\b/i,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) return Math.max(1, Math.min(20, Number(match[1]) || 2));
  }
  return 2;
}

/**
 * Check whether `requestedTime` (24h "HH:MM") falls within any operating
 * period defined in a venue's hours string like:
 *   "Breakfast 7:00 AM - 10:30 AM, Dinner 6:30 PM - 11:00 PM"
 *   "Open 24/7"
 *   "12:00 PM – 10:00 PM"
 * Returns `{ open: true }` if within hours, or `{ open: false, hoursText: string }`.
 */
export function parseVenueHours(
  hoursString: string,
  requestedTime: string
): { open: boolean; hoursText?: string } {
  if (!hoursString?.trim()) return { open: true };

  const lower = hoursString.toLowerCase();
  if (lower.includes("24/7") || lower.includes("24 hours") || lower.includes("always open")) {
    return { open: true };
  }

  const [reqH, reqM] = requestedTime.split(":").map(Number);
  if (Number.isNaN(reqH) || Number.isNaN(reqM)) return { open: true };
  const reqMinutes = reqH * 60 + reqM;

  // Parse time tokens like "7:00 AM", "6:30 PM", "19:00"
  const timeTokenRe = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi;
  const tokens: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = timeTokenRe.exec(hoursString)) !== null) {
    let h = Number(m[1]);
    const min = m[2] ? Number(m[2]) : 0;
    const mer = m[3]?.toLowerCase();
    if (mer === "pm" && h < 12) h += 12;
    if (mer === "am" && h === 12) h = 0;
    tokens.push(h * 60 + min);
  }

  // Pair up tokens as open-close windows
  for (let i = 0; i + 1 < tokens.length; i += 2) {
    const open = tokens[i];
    const close = tokens[i + 1];
    if (close > open) {
      if (reqMinutes >= open && reqMinutes < close) return { open: true };
    } else {
      // Overnight window (e.g. 10 PM – 2 AM)
      if (reqMinutes >= open || reqMinutes < close) return { open: true };
    }
  }

  return { open: false, hoursText: hoursString };
}
