/**
 * OpenAI TTS fallback when Nemotron Speech NIM is not deployed.
 */

import { getOpenAiApiKey } from "@/lib/openai";
import { sanitizeForSpeech } from "@/lib/humanizeSpeech";
import type { NemotronVoicePersona } from "@/lib/nemotronVoice";

export function isOpenAiTtsConfigured(): boolean {
  return Boolean(getOpenAiApiKey());
}

const VOICE_BY_STYLE: Record<NemotronVoicePersona, string> = {
  warm: "coral",
  professional: "onyx",
  energetic: "shimmer",
};

export function resolveOpenAiVoice(voiceStyle: NemotronVoicePersona = "warm"): string {
  const override = process.env.OPENAI_TTS_VOICE?.trim();
  if (override) return override;
  return VOICE_BY_STYLE[voiceStyle];
}

export async function synthesizeWithOpenAiTts(options: {
  text: string;
  voiceStyle?: NemotronVoicePersona;
}): Promise<{ audio?: Buffer; error?: string; contentType?: string }> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) return { error: "OpenAI TTS not configured" };

  const text = sanitizeForSpeech(options.text);
  if (!text) return { error: "No text to synthesize" };

  const model = process.env.OPENAI_TTS_MODEL?.trim() || "tts-1";
  const voice = resolveOpenAiVoice(options.voiceStyle ?? "warm");

  try {
    const resp = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
        response_format: "mp3",
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!resp.ok) {
      const body = await resp.text();
      return { error: `OpenAI TTS error ${resp.status}: ${body.slice(0, 160)}` };
    }

    const audio = Buffer.from(await resp.arrayBuffer());
    return audio.length > 0
      ? { audio, contentType: "audio/mpeg" }
      : { error: "Empty audio response" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "OpenAI TTS unreachable";
    return { error: message };
  }
}
