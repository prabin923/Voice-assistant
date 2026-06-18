/**
 * Prepare assistant text for natural spoken delivery.
 */

export function sanitizeForSpeech(text: string): string {
  return text
    .replace(/^IMAGE:\s*\S+\s*$/gim, "")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[ESCALATE\]/gi, "")
    // Strip markdown list markers that sound unnatural when read aloud
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([,.;!?])\s*/g, "$1 ")
    .replace(/([a-z])\s*-\s*([a-z])/gi, "$1 $2")
    .replace(/\bcheck-in\b/gi, "check in")
    .replace(/\bcheck-out\b/gi, "check out")
    .trim();
}

/** Trim overly long replies for voice — keeps demos punchy and TTS-friendly. */
export function trimForVoiceReply(text: string, maxChars = 240): string {
  const cleaned = sanitizeForSpeech(text);
  if (cleaned.length <= maxChars) return cleaned;
  const slice = cleaned.slice(0, maxChars);
  const lastStop = Math.max(slice.lastIndexOf("."), slice.lastIndexOf("!"), slice.lastIndexOf("?"));
  if (lastStop > 80) return slice.slice(0, lastStop + 1).trim();
  return `${slice.trim()}…`;
}

/** Insert SSML micro-pauses for more natural MAI / neural TTS pacing. */
export function speechTextToSsmlBody(text: string): string {
  const safe = sanitizeForSpeech(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

  return safe
    .replace(/([.!?])\s+/g, '$1<break time="400ms"/> ')
    .replace(/,\s+/g, ',<break time="180ms"/> ');
}

export const VOICE_STATUS = {
  ready: "Tap to speak with me",
  listening: "I'm listening…",
  thinking: "Give me a moment…",
  speaking: "Speaking with you…",
  tapToEnd: "Tap to end",
} as const;
