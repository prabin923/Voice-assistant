/**
 * Self-hosted speech-to-text (OpenAI Whisper).
 * Run your own model locally or on a VPS — no Gemini quota needed for STT.
 */

import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface SelfHostedSttConfig {
  endpoint: string;
  model: string;
  apiKey?: string;
}

export function getSelfHostedSttConfig(): SelfHostedSttConfig | undefined {
  const endpoint = process.env.WHISPER_STT_ENDPOINT?.trim();
  if (!endpoint) return undefined;
  return {
    endpoint,
    model: process.env.WHISPER_STT_MODEL?.trim() || "whisper-large-v3-turbo",
    apiKey: process.env.WHISPER_STT_API_KEY?.trim(),
  };
}

export function isSelfHostedSttConfigured(): boolean {
  if (getSelfHostedSttConfig()) return true;
  if (process.env.VERCEL) return false;
  return Boolean(process.env.WHISPER_MODEL_PATH?.trim());
}

function cleanWhisperText(raw: string): string {
  return raw
    .replace(/\[.*?\]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** OpenAI-compatible POST /audio/transcriptions (faster-whisper-server, etc.). */
export async function transcribeWithWhisperServer(
  audioBlob: Blob,
  language?: string
): Promise<{ text?: string; error?: string }> {
  const cfg = getSelfHostedSttConfig();
  if (!cfg) return { error: "Self-hosted STT not configured" };

  const url = cfg.endpoint.endsWith("/")
    ? `${cfg.endpoint}audio/transcriptions`
    : `${cfg.endpoint}/audio/transcriptions`;

  const form = new FormData();
  form.append("file", audioBlob, "audio.webm");
  form.append("model", cfg.model);
  form.append("response_format", "json");
  if (language) form.append("language", language.split("-")[0]);

  const headers: Record<string, string> = {};
  if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: form,
      signal: AbortSignal.timeout(90_000),
    });

    if (!resp.ok) {
      const body = await resp.text();
      return { error: `Whisper server error ${resp.status}: ${body.slice(0, 120)}` };
    }

    const data = (await resp.json()) as { text?: string };
    const text = data.text?.trim();
    return text ? { text } : { error: "No speech detected" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Whisper server unreachable";
    return { error: message };
  }
}

/** Local whisper-cpp CLI (dev machine). Requires: brew install whisper-cpp ffmpeg */
export async function transcribeWithLocalWhisper(
  audioBuffer: Buffer
): Promise<{ text?: string; error?: string }> {
  const modelPath = process.env.WHISPER_MODEL_PATH?.trim();
  if (!modelPath || process.env.VERCEL) {
    return { error: "Local Whisper not configured" };
  }

  const id = randomUUID();
  const inputPath = join(tmpdir(), `staynep-stt-${id}.webm`);
  const wavPath = join(tmpdir(), `staynep-stt-${id}.wav`);

  try {
    await writeFile(inputPath, audioBuffer);
    await execFileAsync("ffmpeg", ["-y", "-i", inputPath, "-ar", "16000", "-ac", "1", wavPath], {
      timeout: 30_000,
    });

    const { stdout } = await execFileAsync(
      "whisper-cli",
      ["-m", modelPath, "-f", wavPath, "-np", "-nt"],
      { timeout: 120_000, maxBuffer: 2 * 1024 * 1024 }
    );

    const text = cleanWhisperText(stdout);
    return text ? { text } : { error: "No speech detected" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Local Whisper failed";
    if (/ffmpeg|whisper-cli|ENOENT/i.test(message)) {
      return {
        error:
          "Install local Whisper: brew install whisper-cpp ffmpeg, download a ggml model, set WHISPER_MODEL_PATH in .env.local",
      };
    }
    return { error: message };
  } finally {
    await Promise.all([inputPath, wavPath].map((p) => unlink(p).catch(() => {})));
  }
}
