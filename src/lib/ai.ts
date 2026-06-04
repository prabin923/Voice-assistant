import { getGeminiApiKey, isGeminiConfigured } from "@/lib/gemini";
import { getOpenAiApiKey, isOpenAiConfigured } from "@/lib/openai";

export type AiProvider = "openai" | "gemini";

export function isAiConfigured(): boolean {
  return isOpenAiConfigured() || isGeminiConfigured();
}

export function getActiveAiProvider(): AiProvider | null {
  if (getGeminiApiKey()) return "gemini";
  if (getOpenAiApiKey()) return "openai";
  return null;
}

export function aiNotConfiguredResponse() {
  return {
    error: "AI API key not configured.",
    details:
      "Add OPENAI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY to .env.local (local) or Vercel → Environment Variables (production), then restart dev or redeploy.",
  };
}
