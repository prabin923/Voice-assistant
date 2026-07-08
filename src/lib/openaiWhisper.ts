/**
 * OpenAI hosted speech-to-text (Whisper) — fast, reliable cloud STT for the
 * voice loop. Preferred over the Gemini multimodal fallback for smoother
 * speech-to-speech because Whisper is purpose-built for transcription.
 *
 * Used only in the "cloud" voice stack (the "free"/college stack deliberately
 * avoids paid OpenAI APIs — see voiceStack.ts). Gated on OPENAI_API_KEY.
 */

import { getOpenAiApiKey } from "@/lib/openai";

export function isOpenAiWhisperConfigured(): boolean {
  return Boolean(getOpenAiApiKey());
}

const MIME_EXT: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/flac": "flac",
};

/**
 * Transcribe audio via OpenAI's /audio/transcriptions endpoint.
 * Model is configurable via OPENAI_STT_MODEL (default "whisper-1"; you can set
 * "gpt-4o-mini-transcribe" or "gpt-4o-transcribe" for higher accuracy).
 */
export async function transcribeWithOpenAiWhisper(
  audioBlob: Blob,
  baseMime: string,
  language?: string
): Promise<{ text?: string; error?: string }> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) return { error: "OpenAI Whisper not configured" };

  const model = process.env.OPENAI_STT_MODEL?.trim() || "whisper-1";
  const ext = MIME_EXT[baseMime] || "webm";

  const form = new FormData();
  form.append("file", audioBlob, `audio.${ext}`);
  form.append("model", model);
  form.append("response_format", "json");
  // Whisper expects an ISO-639-1 code ("en", "ne"), not a locale ("en-US").
  if (language) form.append("language", language.split("-")[0]);

  try {
    const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(
        Number(process.env.OPENAI_STT_TIMEOUT_MS) || 20_000
      ),
    });

    if (!resp.ok) {
      const body = await resp.text();
      return { error: `OpenAI Whisper error ${resp.status}: ${body.slice(0, 160)}` };
    }

    const data = (await resp.json()) as { text?: string };
    const text = data.text?.trim();
    return text ? { text } : { error: "OpenAI Whisper returned no text" };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown error";
    return { error: `OpenAI Whisper request failed: ${reason}` };
  }
}
