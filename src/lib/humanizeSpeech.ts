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
    .replace(/\s+/g, " ")
    .replace(/\s*([,.;!?])\s*/g, "$1 ")
    .replace(/([a-z])\s*-\s*([a-z])/gi, "$1 $2")
    .trim();
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
