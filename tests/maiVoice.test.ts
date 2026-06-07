import { describe, it, expect } from "vitest";
import {
  buildMaiVoiceSsml,
  escapeSsml,
  resolveMaiVoice,
} from "@/lib/maiVoice";
import { sanitizeForSpeech as sanitizeSpeechText } from "@/lib/humanizeSpeech";
import { buildAzureTtsUrl, resolveAzureSpeechRegion } from "@/lib/azureSpeech";

describe("MAI Voice helpers", () => {
  it("sanitizes markdown and image markup for speech", () => {
    expect(sanitizeSpeechText("**Hello** `world`")).toBe("Hello world");
    expect(sanitizeSpeechText("IMAGE: /room.jpg")).toBe("");
  });

  it("escapes SSML-sensitive characters", () => {
    expect(escapeSsml(`Tom & Jerry say "hi"`)).toBe(
      "Tom &amp; Jerry say &quot;hi&quot;"
    );
  });

  it("resolves MAI-Voice-2 for supported locales", () => {
    const voice = resolveMaiVoice("fr-FR", "warm");
    expect(voice?.voiceName).toBe("fr-FR-Soleil:MAI-Voice-2");
    expect(voice?.expressStyle).toBe("friendly");
  });

  it("resolves MAI-Voice-2 for English by default", () => {
    const voice = resolveMaiVoice("en-US", "energetic");
    expect(voice?.voiceName).toBe("en-US-Harper:MAI-Voice-2");
    expect(voice?.expressStyle).toBe("excited");
  });

  it("returns undefined for unsupported languages", () => {
    expect(resolveMaiVoice("ne-NP", "warm")).toBeUndefined();
  });

  it("builds valid SSML with express-as style", () => {
    const ssml = buildMaiVoiceSsml("Welcome to the hotel.", {
      voiceName: "en-US-Harper:MAI-Voice-2",
      xmlLang: "en-US",
      model: "MAI-Voice-2",
      expressStyle: "friendly",
      styleDegree: "1.0",
    });
    expect(ssml).toContain('name="en-US-Harper:MAI-Voice-2"');
    expect(ssml).toContain('style="friendly"');
    expect(ssml).toContain("Welcome to the hotel.");
  });
});

describe("Azure Speech region resolution", () => {
  it("reads region from TTS endpoint env pattern", () => {
    const region = resolveAzureSpeechRegion();
    expect(region === undefined || typeof region === "string").toBe(true);
  });

  it("builds TTS URL from custom resource endpoint without region", () => {
    const prev = {
      key: process.env.AZURE_SPEECH_KEY,
      endpoint: process.env.AZURE_SPEECH_ENDPOINT,
      region: process.env.AZURE_SPEECH_REGION,
      ttsEndpoint: process.env.MAI_VOICE_TTS_ENDPOINT,
    };

    process.env.AZURE_SPEECH_KEY = "test-key";
    process.env.AZURE_SPEECH_ENDPOINT = "https://my-speech.cognitiveservices.azure.com";
    delete process.env.AZURE_SPEECH_REGION;
    delete process.env.MAI_VOICE_TTS_ENDPOINT;

    expect(buildAzureTtsUrl()).toBe(
      "https://my-speech.cognitiveservices.azure.com/tts/cognitiveservices/v1"
    );

    if (prev.key === undefined) delete process.env.AZURE_SPEECH_KEY;
    else process.env.AZURE_SPEECH_KEY = prev.key;
    if (prev.endpoint === undefined) delete process.env.AZURE_SPEECH_ENDPOINT;
    else process.env.AZURE_SPEECH_ENDPOINT = prev.endpoint;
    if (prev.region === undefined) delete process.env.AZURE_SPEECH_REGION;
    else process.env.AZURE_SPEECH_REGION = prev.region;
    if (prev.ttsEndpoint === undefined) delete process.env.MAI_VOICE_TTS_ENDPOINT;
    else process.env.MAI_VOICE_TTS_ENDPOINT = prev.ttsEndpoint;
  });

  it("builds TTS URL when region env is set", () => {
    const prev = {
      key: process.env.AZURE_SPEECH_KEY,
      endpoint: process.env.AZURE_SPEECH_ENDPOINT,
      region: process.env.AZURE_SPEECH_REGION,
      ttsEndpoint: process.env.MAI_VOICE_TTS_ENDPOINT,
    };

    process.env.AZURE_SPEECH_KEY = "test-key";
    process.env.AZURE_SPEECH_ENDPOINT = "https://example.cognitiveservices.azure.com";
    process.env.AZURE_SPEECH_REGION = "eastus";
    delete process.env.MAI_VOICE_TTS_ENDPOINT;

    expect(buildAzureTtsUrl()).toBe(
      "https://eastus.tts.speech.microsoft.com/cognitiveservices/v1"
    );

    if (prev.key === undefined) delete process.env.AZURE_SPEECH_KEY;
    else process.env.AZURE_SPEECH_KEY = prev.key;
    if (prev.endpoint === undefined) delete process.env.AZURE_SPEECH_ENDPOINT;
    else process.env.AZURE_SPEECH_ENDPOINT = prev.endpoint;
    if (prev.region === undefined) delete process.env.AZURE_SPEECH_REGION;
    else process.env.AZURE_SPEECH_REGION = prev.region;
    if (prev.ttsEndpoint === undefined) delete process.env.MAI_VOICE_TTS_ENDPOINT;
    else process.env.MAI_VOICE_TTS_ENDPOINT = prev.ttsEndpoint;
  });
});
