/**
 * Voice stack selection for college / self-hosted demos vs paid cloud providers.
 *
 * free  — Open-source Whisper STT + Edge TTS (no MiniMax / paid OpenAI voice APIs)
 * cloud — Try Nemotron / MiniMax / OpenAI TTS when configured
 */

import { isMinimaxTtsConfigured } from "@/lib/minimaxTts";
import { isNemotronAsrConfigured } from "@/lib/nemotronTranscribe";
import { getSelfHostedSttConfig, isSelfHostedSttConfigured } from "@/lib/selfHostedStt";

export type VoiceStackMode = "free" | "cloud";

export function getVoiceStackMode(): VoiceStackMode {
  const explicit = process.env.VOICE_STACK?.trim().toLowerCase();
  if (explicit === "free" || explicit === "opensource" || explicit === "college") return "free";
  if (explicit === "cloud" || explicit === "paid") return "cloud";
  return "free";
}

export function isFreeVoiceStack(): boolean {
  return getVoiceStackMode() === "free";
}

export function isPaidWhisperEndpoint(endpoint: string): boolean {
  const lower = endpoint.toLowerCase();
  return lower.includes("api.openai.com") || lower.includes("openai.azure.com");
}

export function isLocalWhisperEndpoint(endpoint: string): boolean {
  const lower = endpoint.toLowerCase();
  return (
    lower.includes("localhost") ||
    lower.includes("127.0.0.1") ||
    lower.includes("0.0.0.0") ||
    !/^https?:\/\//.test(lower)
  );
}

/** Whisper HTTP server we should call in the current stack. */
export function shouldUseWhisperHttpServer(): boolean {
  const cfg = getSelfHostedSttConfig();
  if (!cfg) return false;
  if (isFreeVoiceStack() && isPaidWhisperEndpoint(cfg.endpoint)) return false;
  return true;
}

export function describeVoiceStack(): {
  mode: VoiceStackMode;
  stt: string[];
  tts: string[];
} {
  const stt: string[] = [];
  const tts: string[] = [];

  if (isFreeVoiceStack()) {
    if (process.env.WHISPER_MODEL_PATH?.trim()) stt.push("whisper-cpp (local)");
    if (shouldUseWhisperHttpServer()) stt.push("whisper-server (docker)");
    stt.push("gemini-stt-fallback");
    tts.push("edge-tts", "browser");
  } else {
    if (isMinimaxTtsConfigured()) tts.push("minimax");
    if (isNemotronAsrConfigured()) stt.push("nemotron-asr");
    stt.push("whisper", "gemini");
    tts.push("nemotron", "openai", "edge");
  }

  return { mode: getVoiceStackMode(), stt, tts };
}

export function isCollegeVoiceReady(): boolean {
  return (
    isSelfHostedSttConfigured() ||
    Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim())
  );
}
