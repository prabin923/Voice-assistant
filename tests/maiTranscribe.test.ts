import { describe, it, expect } from "vitest";
import {
  buildMaiDefinition,
  extensionForMime,
  extractMaiTranscript,
  toMaiLocale,
} from "@/lib/maiTranscribe";

describe("MAI Transcribe helpers", () => {
  it("maps BCP-47 language to MAI locale", () => {
    expect(toMaiLocale("en-US")).toBe("en");
    expect(toMaiLocale("ne-NP")).toBe("ne");
    expect(toMaiLocale("invalid")).toBeUndefined();
  });

  it("picks file extension from mime type", () => {
    expect(extensionForMime("audio/webm;codecs=opus")).toBe("webm");
    expect(extensionForMime("audio/wav")).toBe("wav");
    expect(extensionForMime("audio/mpeg")).toBe("mp3");
  });

  it("builds definition with enhanced mode and phrase list", () => {
    const def = buildMaiDefinition(
      {
        endpoint: "https://example.cognitiveservices.azure.com",
        apiKey: "key",
        model: "mai-transcribe-1.5",
      },
      {
        language: "en-US",
        phraseList: ["StayNep", "Grand Plaza"],
        transcribeStyle: "readability",
      }
    );

    expect(def.locales).toEqual(["en"]);
    expect(def.enhancedMode).toEqual({
      enabled: true,
      model: "mai-transcribe-1.5",
      transcribeStyle: "readability",
    });
    expect(def.phraseList).toEqual({ phrases: ["StayNep", "Grand Plaza"] });
  });

  it("extracts combined transcript text from API response", () => {
    const text = extractMaiTranscript({
      combinedPhrases: [{ text: "What time is check-in?" }],
    });
    expect(text).toBe("What time is check-in?");
  });

  it("falls back to phrase segments when combinedPhrases missing", () => {
    const text = extractMaiTranscript({
      phrases: [{ text: "Hello" }, { text: "there" }],
    });
    expect(text).toBe("Hello there");
  });
});
