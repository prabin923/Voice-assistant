import { normalizeSpeechEndpoint } from "@/lib/azureSpeech";

/**
 * Microsoft MAI-Transcribe via Azure LLM Speech API.
 * @see https://learn.microsoft.com/en-us/azure/ai-services/speech-service/mai-transcribe
 */

export interface MaiTranscribeConfig {
  endpoint: string;
  apiKey: string;
  model: "mai-transcribe-1.5" | "mai-transcribe-1";
}

export interface MaiTranscribeOptions {
  language?: string;
  phraseList?: string[];
  /** readability (default) or verbatim */
  transcribeStyle?: "readability" | "verbatim";
}

const API_VERSION = "2025-10-15";

export function getMaiTranscribeConfig(): MaiTranscribeConfig | undefined {
  const apiKey = process.env.AZURE_SPEECH_KEY?.trim();
  const endpoint = process.env.AZURE_SPEECH_ENDPOINT?.trim();
  if (!apiKey || !endpoint) return undefined;

  const modelRaw = process.env.MAI_TRANSCRIBE_MODEL?.trim() || "mai-transcribe-1.5";
  const model =
    modelRaw === "mai-transcribe-1" ? "mai-transcribe-1" : "mai-transcribe-1.5";

  return {
    apiKey,
    endpoint: normalizeSpeechEndpoint(endpoint),
    model,
  };
}

export function isMaiTranscribeConfigured(): boolean {
  return Boolean(getMaiTranscribeConfig());
}

/** Map BCP-47 tags (en-US) to MAI locale codes (en). */
export function toMaiLocale(language?: string): string | undefined {
  if (!language) return undefined;
  const base = language.split("-")[0]?.toLowerCase();
  return base && /^[a-z]{2}$/.test(base) ? base : undefined;
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

/** Parse comma-separated hotel/domain terms from env. */
export function parsePhraseListFromEnv(): string[] | undefined {
  const raw = process.env.MAI_TRANSCRIBE_PHRASE_LIST?.trim();
  if (!raw) return undefined;
  const phrases = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 50);
  return phrases.length > 0 ? phrases : undefined;
}

export function buildMaiDefinition(
  config: MaiTranscribeConfig,
  options: MaiTranscribeOptions = {}
): Record<string, unknown> {
  const definition: Record<string, unknown> = {
    enhancedMode: {
      enabled: true,
      model: config.model,
    },
  };

  const locale = toMaiLocale(options.language);
  if (locale) definition.locales = [locale];

  if (config.model === "mai-transcribe-1.5") {
    if (options.transcribeStyle) {
      (definition.enhancedMode as Record<string, unknown>).transcribeStyle =
        options.transcribeStyle;
    }
    const phrases = options.phraseList?.length ? options.phraseList : parsePhraseListFromEnv();
    if (phrases?.length) {
      definition.phraseList = { phrases };
    }
  }

  return definition;
}

export function extractMaiTranscript(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const data = payload as {
    combinedPhrases?: Array<{ text?: string }>;
    phrases?: Array<{ text?: string }>;
  };

  const combined = data.combinedPhrases
    ?.map((p) => p.text?.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
  if (combined) return combined;

  const segmented = data.phrases
    ?.map((p) => p.text?.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
  return segmented || undefined;
}

export async function transcribeWithMai(
  audioBlob: Blob,
  mimeType: string,
  options: MaiTranscribeOptions = {}
): Promise<{ text?: string; error?: string }> {
  const config = getMaiTranscribeConfig();
  if (!config) return { error: "MAI Transcribe not configured" };

  const url = `${config.endpoint}/speechtotext/transcriptions:transcribe?api-version=${API_VERSION}`;
  const definition = buildMaiDefinition(config, options);
  const ext = extensionForMime(mimeType);

  const form = new FormData();
  form.append("audio", audioBlob, `audio.${ext}`);
  form.append("definition", JSON.stringify(definition));

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Ocp-Apim-Subscription-Key": config.apiKey },
      body: form,
      signal: AbortSignal.timeout(90_000),
    });

    if (!resp.ok) {
      const body = await resp.text();
      return {
        error: `MAI Transcribe error ${resp.status}: ${body.slice(0, 160)}`,
      };
    }

    const data = await resp.json();
    const text = extractMaiTranscript(data);
    return text ? { text } : { error: "No speech detected" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "MAI Transcribe unreachable";
    return { error: message };
  }
}
