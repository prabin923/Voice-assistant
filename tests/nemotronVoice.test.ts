import { describe, it, expect } from "vitest";
import { resolveNemotronVoice } from "@/lib/nemotronVoice";
import { sanitizeForSpeech as sanitizeSpeechText } from "@/lib/humanizeSpeech";
import { getNemotronAsrEndpoint, getNemotronTtsEndpoint } from "@/lib/nemotronSpeech";

describe("Nemotron Voice helpers", () => {
  it("sanitizes markdown and image markup for speech", () => {
    expect(sanitizeSpeechText("**Hello** `world`")).toBe("Hello world");
    expect(sanitizeSpeechText("IMAGE: /room.jpg")).toBe("");
  });

  it("resolves Magpie voice for supported locales", () => {
    const voice = resolveNemotronVoice("fr-FR", "warm");
    expect(voice?.voiceName).toBe("Magpie-Multilingual.FR-FR.Aria");
    expect(voice?.language).toBe("fr-FR");
  });

  it("resolves Magpie voice for English by persona", () => {
    const voice = resolveNemotronVoice("en-US", "energetic");
    expect(voice?.voiceName).toBe("Magpie-Multilingual.EN-US.Leo");
    expect(voice?.language).toBe("en-US");
  });

  it("returns undefined for unsupported languages", () => {
    expect(resolveNemotronVoice("ne-NP", "warm")).toBeUndefined();
  });
});

describe("Nemotron endpoint resolution", () => {
  it("reads ASR and TTS endpoints from env", () => {
    const prev = {
      asr: process.env.NEMOTRON_ASR_ENDPOINT,
      tts: process.env.NEMOTRON_TTS_ENDPOINT,
      shared: process.env.NEMOTRON_SPEECH_ENDPOINT,
    };

    process.env.NEMOTRON_ASR_ENDPOINT = "http://asr.local:9000";
    process.env.NEMOTRON_TTS_ENDPOINT = "http://tts.local:9001";
    delete process.env.NEMOTRON_SPEECH_ENDPOINT;

    expect(getNemotronAsrEndpoint()).toBe("http://asr.local:9000");
    expect(getNemotronTtsEndpoint()).toBe("http://tts.local:9001");

    if (prev.asr === undefined) delete process.env.NEMOTRON_ASR_ENDPOINT;
    else process.env.NEMOTRON_ASR_ENDPOINT = prev.asr;
    if (prev.tts === undefined) delete process.env.NEMOTRON_TTS_ENDPOINT;
    else process.env.NEMOTRON_TTS_ENDPOINT = prev.tts;
    if (prev.shared === undefined) delete process.env.NEMOTRON_SPEECH_ENDPOINT;
    else process.env.NEMOTRON_SPEECH_ENDPOINT = prev.shared;
  });

  it("falls back to shared speech endpoint", () => {
    const prev = {
      asr: process.env.NEMOTRON_ASR_ENDPOINT,
      tts: process.env.NEMOTRON_TTS_ENDPOINT,
      shared: process.env.NEMOTRON_SPEECH_ENDPOINT,
    };

    delete process.env.NEMOTRON_ASR_ENDPOINT;
    delete process.env.NEMOTRON_TTS_ENDPOINT;
    process.env.NEMOTRON_SPEECH_ENDPOINT = "http://speech.local:9000";

    expect(getNemotronAsrEndpoint()).toBe("http://speech.local:9000");
    expect(getNemotronTtsEndpoint()).toBe("http://speech.local:9000");

    if (prev.asr === undefined) delete process.env.NEMOTRON_ASR_ENDPOINT;
    else process.env.NEMOTRON_ASR_ENDPOINT = prev.asr;
    if (prev.tts === undefined) delete process.env.NEMOTRON_TTS_ENDPOINT;
    else process.env.NEMOTRON_TTS_ENDPOINT = prev.tts;
    if (prev.shared === undefined) delete process.env.NEMOTRON_SPEECH_ENDPOINT;
    else process.env.NEMOTRON_SPEECH_ENDPOINT = prev.shared;
  });
});
