/** Shared Gemini API key resolution for chat, STT, and concierge routes. */
import { isMaiTranscribeConfigured } from "@/lib/maiTranscribe";
import { isSelfHostedSttConfigured } from "@/lib/selfHostedStt";
export function getGeminiApiKey(): string | undefined {
  const candidates = [
    process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
  ];

  for (const raw of candidates) {
    const key = raw?.trim();
    if (key && key !== "your_gemini_api_key_here") return key;
  }
  return undefined;
}

export function isGeminiConfigured(): boolean {
  return Boolean(getGeminiApiKey());
}

/** STT: MAI-Transcribe, self-hosted Whisper, and/or Gemini fallback. */
export function isSttConfigured(): boolean {
  return isMaiTranscribeConfigured() || isSelfHostedSttConfigured() || isGeminiConfigured();
}

export function geminiNotConfiguredResponse() {
  return {
    error: "Gemini API Key not configured.",
    details:
      "Add GOOGLE_GENERATIVE_AI_API_KEY to .env.local (local) or Vercel → Environment Variables (production), then restart dev or redeploy.",
  };
}

/** Map Gemini SDK errors to safe client-facing messages. */
export function mapGeminiApiError(error: unknown): { error: string; status: number } {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("429") || /quota|rate limit|too many requests/i.test(message)) {
    return {
      error: "Gemini API quota exceeded. Wait a minute or check usage in Google AI Studio.",
      status: 429,
    };
  }
  if (message.includes("API_KEY_INVALID") || /api key not valid/i.test(message)) {
    return {
      error: "Gemini API key is invalid. Update GOOGLE_GENERATIVE_AI_API_KEY and restart.",
      status: 503,
    };
  }
  if (message.includes("400") && /mime|audio|unsupported/i.test(message)) {
    return {
      error: "Unsupported audio format. Try speaking again or switch browser.",
      status: 400,
    };
  }

  return { error: "Failed to transcribe audio.", status: 500 };
}

