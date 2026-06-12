/**
 * NVIDIA Nemotron Speech TTS (Magpie) via Speech NIM HTTP API.
 * @see https://docs.nvidia.com/nim/speech/latest/get-started/tutorials/tts.html
 */

import { sanitizeForSpeech } from "@/lib/humanizeSpeech";
import {
  getNemotronTtsEndpoint,
  isNemotronTtsConfigured,
  nemotronAuthHeaders,
} from "@/lib/nemotronSpeech";

export type NemotronVoicePersona = "warm" | "professional" | "energetic";

export interface NemotronVoiceSynthesisOptions {
  text: string;
  language?: string;
  voiceStyle?: NemotronVoicePersona;
}

export interface NemotronVoiceSelection {
  voiceName: string;
  language: string;
}

/** Magpie Multilingual voices for hotel reception by locale + persona. */
const VOICE_BY_LANG: Record<
  string,
  Record<NemotronVoicePersona, string>
> = {
  "de-DE": {
    warm: "Magpie-Multilingual.DE-DE.Aria",
    professional: "Magpie-Multilingual.DE-DE.Leo",
    energetic: "Magpie-Multilingual.DE-DE.Leo",
  },
  "en-AU": {
    warm: "Magpie-Multilingual.EN-US.Aria",
    professional: "Magpie-Multilingual.EN-US.Jason",
    energetic: "Magpie-Multilingual.EN-US.Leo",
  },
  "en-GB": {
    warm: "Magpie-Multilingual.EN-US.Aria",
    professional: "Magpie-Multilingual.EN-US.Jason",
    energetic: "Magpie-Multilingual.EN-US.Leo",
  },
  "en-US": {
    warm: "Magpie-Multilingual.EN-US.Aria",
    professional: "Magpie-Multilingual.EN-US.Jason",
    energetic: "Magpie-Multilingual.EN-US.Leo",
  },
  "es-ES": {
    warm: "Magpie-Multilingual.ES-US.Aria",
    professional: "Magpie-Multilingual.ES-US.Jason",
    energetic: "Magpie-Multilingual.ES-US.Leo",
  },
  "es-MX": {
    warm: "Magpie-Multilingual.ES-US.Aria",
    professional: "Magpie-Multilingual.ES-US.Jason",
    energetic: "Magpie-Multilingual.ES-US.Leo",
  },
  "fr-FR": {
    warm: "Magpie-Multilingual.FR-FR.Aria",
    professional: "Magpie-Multilingual.FR-FR.Pascal",
    energetic: "Magpie-Multilingual.FR-FR.Leo",
  },
  "hi-IN": {
    warm: "Magpie-Multilingual.HI-IN.Sofia",
    professional: "Magpie-Multilingual.HI-IN.Sofia",
    energetic: "Magpie-Multilingual.HI-IN.Sofia",
  },
  "it-IT": {
    warm: "Magpie-Multilingual.IT-IT.Aria",
    professional: "Magpie-Multilingual.IT-IT.Leo",
    energetic: "Magpie-Multilingual.IT-IT.Leo",
  },
  "ja-JP": {
    warm: "Magpie-Multilingual.JA-JP.Aria",
    professional: "Magpie-Multilingual.JA-JP.Aria",
    energetic: "Magpie-Multilingual.JA-JP.Aria",
  },
  "ko-KR": {
    warm: "Magpie-Multilingual.EN-US.Aria",
    professional: "Magpie-Multilingual.EN-US.Jason",
    energetic: "Magpie-Multilingual.EN-US.Leo",
  },
  "pt-BR": {
    warm: "Magpie-Multilingual.EN-US.Aria",
    professional: "Magpie-Multilingual.EN-US.Jason",
    energetic: "Magpie-Multilingual.EN-US.Leo",
  },
  "zh-CN": {
    warm: "Magpie-Multilingual.ZH-CN.Aria",
    professional: "Magpie-Multilingual.ZH-CN.Leo",
    energetic: "Magpie-Multilingual.ZH-CN.Leo",
  },
};

function normalizeLanguage(language?: string): string {
  const raw = (language || "en-US").trim();
  if (!raw) return "en-US";
  const parts = raw.split("-");
  if (parts.length === 1) return parts[0].toLowerCase();
  return `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
}

export { isNemotronTtsConfigured as isNemotronVoiceConfigured };

export function resolveNemotronVoice(
  language?: string,
  voiceStyle: NemotronVoicePersona = "warm"
): NemotronVoiceSelection | undefined {
  const override = process.env.NEMOTRON_TTS_VOICE?.trim();
  const normalized = normalizeLanguage(language);

  if (override) {
    return { voiceName: override, language: normalized };
  }

  if (VOICE_BY_LANG[normalized]) {
    return {
      voiceName: VOICE_BY_LANG[normalized][voiceStyle],
      language: normalized,
    };
  }

  const langPrimary = normalized.split("-")[0];
  for (const [locale, voices] of Object.entries(VOICE_BY_LANG)) {
    if (locale.startsWith(`${langPrimary}-`)) {
      return { voiceName: voices[voiceStyle], language: locale };
    }
  }

  if (normalized.startsWith("en")) {
    return {
      voiceName: VOICE_BY_LANG["en-US"][voiceStyle],
      language: "en-US",
    };
  }

  return undefined;
}

export async function synthesizeWithNemotronVoice(
  options: NemotronVoiceSynthesisOptions
): Promise<{ audio?: Buffer; error?: string; unsupportedLanguage?: boolean; contentType?: string }> {
  const endpoint = getNemotronTtsEndpoint();
  if (!endpoint) return { error: "Nemotron TTS not configured" };

  const text = sanitizeForSpeech(options.text);
  if (!text) return { error: "No text to synthesize" };

  const selection = resolveNemotronVoice(options.language, options.voiceStyle ?? "warm");
  if (!selection) {
    return { error: "Language not supported by Nemotron TTS", unsupportedLanguage: true };
  }

  const url = `${endpoint}/v1/audio/synthesize`;
  const form = new FormData();
  form.append("text", text);
  form.append("language", selection.language);
  form.append("voice", selection.voiceName);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: nemotronAuthHeaders(),
      body: form,
      signal: AbortSignal.timeout(60_000),
    });

    if (!resp.ok) {
      const body = await resp.text();
      return {
        error: `Nemotron TTS error ${resp.status}: ${body.slice(0, 160)}`,
      };
    }

    const audio = Buffer.from(await resp.arrayBuffer());
    const contentType = resp.headers.get("content-type") ?? "audio/wav";
    return audio.length > 0
      ? { audio, contentType }
      : { error: "Empty audio response" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Nemotron TTS unreachable";
    return { error: message };
  }
}
