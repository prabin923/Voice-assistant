import type { ChatHistoryMessage } from "@/lib/dateParsing";

function conversationText(message: string, history: ChatHistoryMessage[]): string {
  return `${history.map((h) => h.content).join(" ")} ${message}`;
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
    /\b(\d+)\s*(?:people|guests|persons|diners|pax)\b/i,
    /\b(\d+)\s*(?:at|for)\s+(?:dinner|lunch|breakfast)\b/i,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) return Math.max(1, Math.min(20, Number(match[1]) || 2));
  }
  return 2;
}
