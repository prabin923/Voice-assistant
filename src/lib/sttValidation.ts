/** Reject model/meta hallucinations and obvious echo from assistant TTS. */

const JUNK_PATTERNS = [
  /provide the audio file/i,
  /audio file or link/i,
  /you would like me to transcribe/i,
  /transcribe this audio/i,
  /only return the transcribed/i,
  /i(?:'m| am) (?:an? )?(?:ai|language) model/i,
  /as an ai/i,
  /cannot transcribe/i,
  /no audio (?:was |)(?:provided|detected)/i,
  /please (?:upload|send) (?:the |an? )?audio/i,
];

export function isJunkTranscription(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (trimmed.length < 2) return true;
  if (trimmed.toUpperCase() === "EMPTY") return true;
  return JUNK_PATTERNS.some((re) => re.test(trimmed));
}

export function sanitizeTranscription(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
