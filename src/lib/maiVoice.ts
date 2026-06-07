/**
 * Microsoft MAI-Voice TTS via Azure Speech REST API.
 * @see https://learn.microsoft.com/en-us/azure/ai-services/speech-service/mai-voices
 */

import { buildAzureTtsUrl, getAzureSpeechConfig } from "@/lib/azureSpeech";

export type MaiVoicePersona = "warm" | "professional" | "energetic";

export interface MaiVoiceSynthesisOptions {
  text: string;
  language?: string;
  voiceStyle?: MaiVoicePersona;
}

export interface MaiVoiceSelection {
  voiceName: string;
  xmlLang: string;
  model: "MAI-Voice-1" | "MAI-Voice-2";
  expressStyle?: string;
  styleDegree?: string;
}

const OUTPUT_FORMAT = "audio-24khz-160kbitrate-mono-mp3";

/** MAI-Voice-2 prebuilt voices for multilingual hotel reception. */
const MAI_VOICE_2_BY_LANG: Record<string, string> = {
  "de-DE": "de-DE-Mia:MAI-Voice-2",
  "en-AU": "en-AU-Lisa:MAI-Voice-2",
  "en-GB": "en-AU-Lisa:MAI-Voice-2",
  "en-US": "en-US-Harper:MAI-Voice-2",
  "es-ES": "es-ES-Marta:MAI-Voice-2",
  "es-MX": "es-MX-Valeria:MAI-Voice-2",
  "fr-FR": "fr-FR-Soleil:MAI-Voice-2",
  "hi-IN": "hi-IN-Kavya:MAI-Voice-2",
  "it-IT": "it-IT-Rosa:MAI-Voice-2",
  "ko-KR": "ko-KR-Hana:MAI-Voice-2",
  "nl-NL": "nl-NL-Fleur:MAI-Voice-2",
  "pt-BR": "pt-BR-Luana:MAI-Voice-2",
  "pt-PT": "pt-PT-Rui:MAI-Voice-2",
  "ro-RO": "ro-RO-Elena:MAI-Voice-2",
  "ru-RU": "ru-RU-Masha:MAI-Voice-2",
  "th-TH": "th-TH-Krit:MAI-Voice-2",
  "tr-TR": "tr-TR-Elif:MAI-Voice-2",
  "zh-CN": "zh-CN-Mei:MAI-Voice-2",
};

const MAI_VOICE_1_DEFAULT = "en-us-June:MAI-Voice-1";

export function isMaiVoiceConfigured(): boolean {
  return Boolean(getAzureSpeechConfig()?.apiKey && buildAzureTtsUrl());
}

import { sanitizeForSpeech, speechTextToSsmlBody, VOICE_STATUS } from "@/lib/humanizeSpeech";

export function escapeSsml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeLanguage(language?: string): string {
  const raw = (language || "en-US").trim();
  if (!raw) return "en-US";
  const parts = raw.split("-");
  if (parts.length === 1) return parts[0].toLowerCase();
  return `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
}

function resolveVoice2(language: string): MaiVoiceSelection | undefined {
  if (MAI_VOICE_2_BY_LANG[language]) {
    return {
      voiceName: MAI_VOICE_2_BY_LANG[language],
      xmlLang: language,
      model: "MAI-Voice-2",
    };
  }

  const langPrimary = language.split("-")[0];
  for (const [locale, voice] of Object.entries(MAI_VOICE_2_BY_LANG)) {
    if (locale.startsWith(`${langPrimary}-`)) {
      return { voiceName: voice, xmlLang: locale, model: "MAI-Voice-2" };
    }
  }

  return undefined;
}

export function resolveMaiVoice(
  language?: string,
  voiceStyle: MaiVoicePersona = "warm"
): MaiVoiceSelection | undefined {
  const override = process.env.MAI_VOICE_NAME?.trim();
  const normalized = normalizeLanguage(language);
  const modelPref = process.env.MAI_VOICE_MODEL?.trim().toLowerCase();

  if (override) {
    const model = override.includes("MAI-Voice-2") ? "MAI-Voice-2" : "MAI-Voice-1";
    return applyExpressStyle(
      { voiceName: override, xmlLang: normalized, model },
      voiceStyle
    );
  }

  if (modelPref !== "mai-voice-1") {
    const voice2 = resolveVoice2(normalized);
    if (voice2) return applyExpressStyle(voice2, voiceStyle);
  }

  if (normalized.startsWith("en")) {
    return applyExpressStyle(
      {
        voiceName: MAI_VOICE_1_DEFAULT,
        xmlLang: "en-US",
        model: "MAI-Voice-1",
      },
      voiceStyle
    );
  }

  return undefined;
}

function applyExpressStyle(
  selection: MaiVoiceSelection,
  voiceStyle: MaiVoicePersona
): MaiVoiceSelection {
  if (selection.model === "MAI-Voice-1") {
    if (voiceStyle === "energetic") {
      return { ...selection, expressStyle: "excitement" };
    }
    if (voiceStyle === "warm") {
      return { ...selection, expressStyle: "empathy" };
    }
    return selection;
  }

  if (voiceStyle === "professional") {
    return { ...selection, expressStyle: "softvoice", styleDegree: "1.0" };
  }
  if (voiceStyle === "energetic") {
    return { ...selection, expressStyle: "excited", styleDegree: "1.2" };
  }
  return { ...selection, expressStyle: "friendly", styleDegree: "1.0" };
}

export function buildMaiVoiceSsml(
  text: string,
  selection: MaiVoiceSelection
): string {
  const inner = selection.expressStyle
    ? `<mstts:express-as style="${selection.expressStyle}"${
        selection.styleDegree ? ` styledegree="${selection.styleDegree}"` : ""
      }>${speechTextToSsmlBody(text)}</mstts:express-as>`
    : speechTextToSsmlBody(text);

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="${selection.xmlLang}">
  <voice name="${selection.voiceName}">${inner}</voice>
</speak>`;
}

export async function synthesizeWithMaiVoice(
  options: MaiVoiceSynthesisOptions
): Promise<{ audio?: Buffer; error?: string; unsupportedLanguage?: boolean }> {
  const config = getAzureSpeechConfig();
  const url = buildAzureTtsUrl();
  if (!config || !url) {
    return { error: "MAI Voice not configured" };
  }

  const text = sanitizeForSpeech(options.text);
  if (!text) return { error: "No text to synthesize" };

  const selection = resolveMaiVoice(options.language, options.voiceStyle ?? "warm");
  if (!selection) {
    return { error: "Language not supported by MAI Voice", unsupportedLanguage: true };
  }

  const ssml = buildMaiVoiceSsml(text, selection);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": OUTPUT_FORMAT,
        "Ocp-Apim-Subscription-Key": config.apiKey,
        "User-Agent": "staynep-voice-assistant",
      },
      body: ssml,
      signal: AbortSignal.timeout(60_000),
    });

    if (!resp.ok) {
      const body = await resp.text();
      return {
        error: `MAI Voice error ${resp.status}: ${body.slice(0, 160)}`,
      };
    }

    const audio = Buffer.from(await resp.arrayBuffer());
    return audio.length > 0 ? { audio } : { error: "Empty audio response" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "MAI Voice unreachable";
    return { error: message };
  }
}
