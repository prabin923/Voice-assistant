export type ChatHistoryMessage = { role: "user" | "assistant"; content: string };

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const base = new Date(`${isoDate}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function nextWeekday(from: string, weekday: number): string {
  const base = new Date(`${from}T00:00:00.000Z`);
  const current = base.getUTCDay();
  let delta = (weekday - current + 7) % 7;
  if (delta === 0) delta = 7;
  return addDays(from, delta);
}

const MONTH_NAMES =
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*(\d{4}))?\b/gi;

export function parseMonthNameDates(text: string): string[] {
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = MONTH_NAMES.exec(text)) !== null) {
    const year = Number(m[3] || new Date().getUTCFullYear());
    const parsed = new Date(`${m[1]} ${m[2]}, ${year} UTC`);
    if (!Number.isNaN(parsed.getTime())) {
      matches.push(parsed.toISOString().slice(0, 10));
    }
  }
  return matches;
}

export function detectDateRange(
  message: string,
  history: ChatHistoryMessage[] = []
): {
  checkIn?: string;
  checkOut?: string;
  parseFailed: boolean;
  needsClarification?: boolean;
} {
  const source = `${history.map((h) => h.content).join(" ")} ${message}`.toLowerCase();
  const today = todayIsoDate();

  const iso = source.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? [];
  const slash = source.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/g) ?? [];
  const named = parseMonthNameDates(source);
  const combined = [...iso, ...named];

  for (const token of slash) {
    const parts = token.split(/[/-]/);
    if (parts.length >= 2) {
      const month = Number(parts[0]);
      const day = Number(parts[1]);
      const year = parts[2] ? Number(parts[2].length === 2 ? `20${parts[2]}` : parts[2]) : new Date().getUTCFullYear();
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        combined.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
      }
    }
  }

  if (source.includes("today")) combined.push(today);
  if (source.includes("tomorrow")) combined.push(addDays(today, 1));

  const weekdayMatch = source.match(/\b(next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (weekdayMatch) {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const idx = days.indexOf(weekdayMatch[2]);
    if (idx >= 0) {
      const target =
        weekdayMatch[1] === "this"
          ? (() => {
              const base = new Date(`${today}T00:00:00.000Z`);
              const delta = (idx - base.getUTCDay() + 7) % 7;
              return addDays(today, delta === 0 ? 0 : delta);
            })()
          : nextWeekday(today, idx);
      combined.push(target);
    }
  }

  if (source.includes("this weekend")) {
    combined.push(nextWeekday(today, 6));
    combined.push(nextWeekday(today, 0));
  }

  const nightsMatch = source.match(/\b(\d+)\s*nights?\b/);
  const nights = nightsMatch ? Number(nightsMatch[1]) : undefined;

  const unique = [...new Set(combined.filter(Boolean))].sort();
  if (unique.length >= 2) {
    return { checkIn: unique[0], checkOut: unique[1], parseFailed: false };
  }
  if (unique.length === 1) {
    if (nights && nights > 0) {
      return { checkIn: unique[0], checkOut: addDays(unique[0], nights), parseFailed: false };
    }
    if (/\b(?:one|1)\s*night\b/.test(source) || source.includes("for a night")) {
      return { checkIn: unique[0], checkOut: addDays(unique[0], 1), parseFailed: false };
    }
    if (source.includes("night")) {
      return { checkIn: unique[0], checkOut: addDays(unique[0], 1), parseFailed: false };
    }
    return { checkIn: unique[0], parseFailed: false, needsClarification: true };
  }

  const hasDateHint =
    /\b\d{1,2}[-/]\d{1,2}\b/.test(source) ||
    /\bfrom\b|\bto\b|\buntil\b|\bcheck-?in\b|\bcheck-?out\b/.test(source) ||
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i.test(source);

  return { parseFailed: hasDateHint, needsClarification: false };
}
