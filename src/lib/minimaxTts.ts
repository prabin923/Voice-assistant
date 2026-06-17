/**
 * MiniMax Text-to-Audio (T2A) HTTP API.
 * Base: https://api.minimax.io/v1 (overseas) or https://api.minimaxi.com/v1 (mainland)
 * Endpoint: POST /t2a_v2?GroupId=...
 * Docs: https://platform.minimax.io/docs/api-reference/speech-t2a-http
 */

import type { NemotronVoicePersona } from "@/lib/nemotronVoice";
import { sanitizeForSpeech } from "@/lib/humanizeSpeech";

export type MinimaxVoicePersona = NemotronVoicePersona;

export interface MinimaxTtsOptions {
  text: string;
  voiceStyle?: MinimaxVoicePersona;
  language?: string;
}

export interface MinimaxTtsConfig {
  apiKey: string;
  groupId: string;
  apiBase: string;
  model: string;
  voiceId: string;
  format: "mp3" | "wav" | "pcm" | "flac";
  sampleRate: number;
  bitrate: number;
}

function normalizeApiBase(base: string): string {
  const trimmed = base.trim().replace(/\/$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

export function getMinimaxApiKey(): string | undefined {
  const raw = process.env.MINIMAX_API_KEY?.trim();
  return raw ? raw : undefined;
}

function looksLikeWrongProviderKey(key: string): boolean {
  const lower = key.toLowerCase();
  // Common non-MiniMax prefixes seen in misconfigured env files.
  return lower.startsWith("nvapi-") || lower.startsWith("sk-proj-");
}

export function getMinimaxGroupId(): string | undefined {
  const raw = process.env.MINIMAX_GROUP_ID?.trim() || process.env.MINIMAX_GROUPID?.trim();
  return raw ? raw : undefined;
}

export function getMinimaxApiBase(): string {
  const env = process.env.MINIMAX_API_BASE?.trim();
  return normalizeApiBase(env || "https://api.minimax.io/v1");
}

export function isMinimaxTtsConfigured(): boolean {
  return Boolean(getMinimaxApiKey() && getMinimaxGroupId());
}

function pickVoiceId(persona: MinimaxVoicePersona): string {
  // These are common “system voice” ids referenced in various MiniMax examples.
  // Users can override with MINIMAX_TTS_VOICE_ID.
  if (persona === "professional") return "English_expressive_narrator";
  if (persona === "energetic") return "male-qn-qingse";
  return "Calm_Woman";
}

function pickModel(): string {
  return process.env.MINIMAX_TTS_MODEL?.trim() || "speech-2.8-hd";
}

function pickFormat(): MinimaxTtsConfig["format"] {
  const raw = (process.env.MINIMAX_TTS_FORMAT?.trim() || "mp3").toLowerCase();
  if (raw === "wav" || raw === "pcm" || raw === "flac" || raw === "mp3") return raw;
  return "mp3";
}

function pickSampleRate(): number {
  const raw = Number(process.env.MINIMAX_TTS_SAMPLE_RATE || "32000");
  return Number.isFinite(raw) && raw >= 8000 ? raw : 32000;
}

function pickBitrate(): number {
  const raw = Number(process.env.MINIMAX_TTS_BITRATE || "128000");
  return Number.isFinite(raw) && raw >= 16000 ? raw : 128000;
}

export function getMinimaxTtsConfig(voiceStyle: MinimaxVoicePersona = "warm"): MinimaxTtsConfig | undefined {
  const apiKey = getMinimaxApiKey();
  const groupId = getMinimaxGroupId();
  if (!apiKey || !groupId) return undefined;

  const overrideVoice = process.env.MINIMAX_TTS_VOICE_ID?.trim();

  return {
    apiKey,
    groupId,
    apiBase: getMinimaxApiBase(),
    model: pickModel(),
    voiceId: overrideVoice || pickVoiceId(voiceStyle),
    format: pickFormat(),
    sampleRate: pickSampleRate(),
    bitrate: pickBitrate(),
  };
}

function contentTypeForFormat(format: MinimaxTtsConfig["format"]): string {
  switch (format) {
    case "wav":
      return "audio/wav";
    case "pcm":
      return "audio/pcm";
    case "flac":
      return "audio/flac";
    default:
      return "audio/mpeg";
  }
}

export async function synthesizeWithMinimaxTts(
  options: MinimaxTtsOptions
): Promise<{ audio?: Buffer; contentType?: string; error?: string }> {
  const text = sanitizeForSpeech(options.text);
  if (!text) return { error: "No text to synthesize" };

  const voiceStyle = options.voiceStyle ?? "warm";
  const cfg = getMinimaxTtsConfig(voiceStyle);
  if (!cfg) return { error: "MiniMax TTS not configured" };
  if (looksLikeWrongProviderKey(cfg.apiKey)) {
    return {
      error:
        "MINIMAX_API_KEY appears to be from another provider. Use a MiniMax API key from platform.minimax.io.",
    };
  }

  const url = `${cfg.apiBase}/t2a_v2?GroupId=${encodeURIComponent(cfg.groupId)}`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.model,
        text,
        stream: false,
        language_boost: "auto",
        output_format: "hex",
        voice_setting: {
          voice_id: cfg.voiceId,
          speed: 1,
          vol: 1,
          pitch: 0,
        },
        audio_setting: {
          sample_rate: cfg.sampleRate,
          bitrate: cfg.bitrate,
          format: cfg.format,
          channel: 1,
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!resp.ok) {
      const body = await resp.text();
      return { error: `MiniMax TTS error ${resp.status}: ${body.slice(0, 200)}` };
    }

    const data = (await resp.json()) as {
      base_resp?: { status_code?: number; status_msg?: string };
      data?: { audio?: string };
      audio_file?: string;
    };

    const statusCode = data.base_resp?.status_code ?? 0;
    if (statusCode !== 0) {
      return { error: `MiniMax TTS API error ${statusCode}: ${data.base_resp?.status_msg || "unknown"}` };
    }

    const audioHex = data.data?.audio?.trim() || "";
    if (!audioHex) return { error: "MiniMax TTS returned no audio" };

    const audio = Buffer.from(audioHex, "hex");
    if (!audio.length) return { error: "MiniMax TTS returned empty audio" };

    return { audio, contentType: contentTypeForFormat(cfg.format) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "MiniMax TTS unreachable";
    return { error: message };
  }
}

