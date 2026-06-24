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

const MONTH_ALT =
  "january|february|march|april|may|june|july|august|september|october|november|december";

// Both orderings, because guests write dates either way:
//   "Month Day"  → "June 27", "June 27, 2026"   (US-style)
//   "Day Month"  → "27 June", "27th June 2026"  (UK / many other locales)
const MONTH_DAY = new RegExp(
  `\\b(${MONTH_ALT})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,\\s*(\\d{4}))?\\b`,
  "gi"
);
const DAY_MONTH = new RegExp(
  `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_ALT})(?:,?\\s*(\\d{4}))?\\b`,
  "gi"
);

function resolveMonthDay(
  monthName: string,
  day: string,
  yearStr: string | undefined,
  today: string
): string | null {
  const explicitYear = Boolean(yearStr);
  let year = Number(yearStr || new Date().getUTCFullYear());
  let parsed = new Date(`${monthName} ${day}, ${year} UTC`);
  if (Number.isNaN(parsed.getTime())) return null;
  // Bare month/day with no year: if it's already in the past, the guest
  // means next year (e.g. "June 15" said on June 24 → next June 15).
  if (!explicitYear && parsed.toISOString().slice(0, 10) < today) {
    year += 1;
    parsed = new Date(`${monthName} ${day}, ${year} UTC`);
  }
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export function parseMonthNameDates(text: string): string[] {
  const matches: string[] = [];
  const today = todayIsoDate();
  // [regex, monthGroup, dayGroup, yearGroup]
  const patterns: ReadonlyArray<readonly [RegExp, number, number, number]> = [
    [MONTH_DAY, 1, 2, 3],
    [DAY_MONTH, 2, 1, 3],
  ];
  for (const [regex, monthIdx, dayIdx, yearIdx] of patterns) {
    regex.lastIndex = 0; // reset: module-level /g regex retains lastIndex across calls
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const iso = resolveMonthDay(m[monthIdx], m[dayIdx], m[yearIdx], today);
      if (iso) matches.push(iso);
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
  // Only parse dates the GUEST typed — never the assistant's own messages,
  // which may contain example dates ("e.g. June 10 to June 12") that would
  // otherwise be mistaken for the guest's requested dates.
  const userHistory = history.filter((h) => h.role === "user");
  const source = `${userHistory.map((h) => h.content).join(" ")} ${message}`.toLowerCase();
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

  if (source.includes("today") || source.includes("tonight")) combined.push(today);
  if (source.includes("tomorrow")) combined.push(addDays(today, 1));

  // "in X days/nights" — e.g. "in 3 days", "in two nights"
  const inDaysMatch = source.match(/\bin\s+(\d+)\s*(?:days?|nights?)\b/);
  if (inDaysMatch) combined.push(addDays(today, Number(inDaysMatch[1])));

  // "in a week" / "next week"
  if (/\bin a week\b|\bwithin a week\b/.test(source)) combined.push(addDays(today, 7));
  if (/\bnext week\b/.test(source) && !source.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/)) {
    // Jump to Monday of next calendar week
    const base = new Date(`${today}T00:00:00.000Z`);
    const daysUntilMonday = (8 - base.getUTCDay()) % 7 || 7;
    combined.push(addDays(today, daysUntilMonday));
  }

  const weekdayMatch = source.match(/\b(next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (weekdayMatch) {
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const idx = dayNames.indexOf(weekdayMatch[2]);
    if (idx >= 0) {
      const target =
        weekdayMatch[1] === "this"
          ? (() => {
              const base = new Date(`${today}T00:00:00.000Z`);
              const delta = (idx - base.getUTCDay() + 7) % 7;
              // "this Monday" on a Monday → today; otherwise upcoming occurrence
              return addDays(today, delta);
            })()
          : nextWeekday(today, idx);
      combined.push(target);
    }
  }

  if (source.includes("this weekend") || source.includes("the weekend")) {
    const base = new Date(`${today}T00:00:00.000Z`);
    const dow = base.getUTCDay(); // 0=Sun,6=Sat
    // If already Sat or Sun, use this Sat/Sun; otherwise jump to the upcoming one
    const daysToSat = dow === 6 ? 0 : (6 - dow + 7) % 7;
    const sat = addDays(today, daysToSat);
    const sun = addDays(sat, 1);
    combined.push(sat, sun);
  }

  const nightsMatch = source.match(/\b(\d+)\s*nights?\b/);
  const nights = nightsMatch ? Number(nightsMatch[1]) : undefined;

  const unique = [...new Set(combined.filter(Boolean))].sort();

  // Guard: reject dates that are in the past
  const isPast = (d: string) => d < today;

  if (unique.length >= 2) {
    const [ci, co] = [unique[0], unique[1]];
    if (isPast(ci)) return { parseFailed: false, needsClarification: true };
    return { checkIn: ci, checkOut: co, parseFailed: false };
  }
  if (unique.length === 1) {
    if (isPast(unique[0])) return { parseFailed: false, needsClarification: true };
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
    /\bfrom\b|\bto\b|\buntil\b|\bcheck-?in\b|\bcheck-?out\b|\bchecking in\b|\bchecking out\b/.test(source) ||
    new RegExp(`\\b(${MONTH_ALT})\\s+\\d{1,2}`, "i").test(source) ||
    new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(${MONTH_ALT})`, "i").test(source);

  return { parseFailed: hasDateHint, needsClarification: false };
}
