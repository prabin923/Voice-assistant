/**
 * NVIDIA Nemotron Speech ASR via Speech NIM HTTP API.
 * @see https://docs.nvidia.com/nim/speech/latest/get-started/tutorials/asr.html
 */

import {
  getNemotronAsrEndpoint,
  isNemotronAsrConfigured,
  nemotronAuthHeaders,
} from "@/lib/nemotronSpeech";

export interface NemotronTranscribeOptions {
  language?: string;
  phraseList?: string[];
}

export function extensionForMime(mimeType: string): string {
  const base = mimeType.split(";")[0].trim().toLowerCase();
  switch (base) {
    case "audio/wav":
    case "audio/x-wav":
      return "wav";
    case "audio/mpeg":
      return "mp3";
    case "audio/flac":
      return "flac";
    case "audio/ogg":
      return "ogg";
    case "audio/mp4":
      return "m4a";
    default:
      return "webm";
  }
}

export function normalizeNemotronLanguage(language?: string): string {
  const raw = (language || "en-US").trim();
  if (!raw) return "en-US";
  const parts = raw.split("-");
  if (parts.length === 1) return parts[0].toLowerCase();
  return `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
}

/** Parse comma-separated hotel/domain terms from env. */
export function parsePhraseListFromEnv(): string[] | undefined {
  const raw = process.env.NEMOTRON_ASR_PHRASE_LIST?.trim();
  if (!raw) return undefined;
  const phrases = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 50);
  return phrases.length > 0 ? phrases : undefined;
}

export function extractNemotronTranscript(payload: unknown): string | undefined {
  if (!payload) return undefined;
  if (typeof payload === "string") {
    const text = payload.trim();
    return text || undefined;
  }
  if (typeof payload !== "object") return undefined;

  const data = payload as Record<string, unknown>;
  const direct =
    (typeof data.text === "string" && data.text) ||
    (typeof data.transcript === "string" && data.transcript) ||
    (typeof data.transcription === "string" && data.transcription);
  if (direct) return direct.trim() || undefined;

  const results = data.results;
  if (Array.isArray(results)) {
    const joined = results
      .map((r) => {
        if (!r || typeof r !== "object") return "";
        const row = r as Record<string, unknown>;
        return typeof row.text === "string" ? row.text.trim() : "";
      })
      .filter(Boolean)
      .join(" ")
      .trim();
    if (joined) return joined;
  }

  return undefined;
}

export { isNemotronAsrConfigured };

export async function transcribeWithNemotron(
  audioBlob: Blob,
  mimeType: string,
  options: NemotronTranscribeOptions = {}
): Promise<{ text?: string; error?: string }> {
  const endpoint = getNemotronAsrEndpoint();
  if (!endpoint) return { error: "Nemotron ASR not configured" };

  const url = `${endpoint}/v1/audio/transcriptions`;
  const ext = extensionForMime(mimeType);
  const language = normalizeNemotronLanguage(options.language);

  const form = new FormData();
  form.append("file", audioBlob, `audio.${ext}`);
  form.append("language", language);

  const phrases = options.phraseList?.length
    ? options.phraseList
    : parsePhraseListFromEnv();
  if (phrases?.length) {
    form.append("boosted_lm_words", phrases.join(","));
  }

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: nemotronAuthHeaders(),
      body: form,
      signal: AbortSignal.timeout(90_000),
    });

    if (!resp.ok) {
      const body = await resp.text();
      return {
        error: `Nemotron ASR error ${resp.status}: ${body.slice(0, 160)}`,
      };
    }

    const contentType = resp.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await resp.json()
      : await resp.text();
    const text = extractNemotronTranscript(payload);
    return text ? { text } : { error: "No speech detected" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Nemotron ASR unreachable";
    return { error: message };
  }
}
