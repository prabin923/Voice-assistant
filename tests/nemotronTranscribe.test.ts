import { describe, it, expect } from "vitest";
import {
  extensionForMime,
  extractNemotronTranscript,
  normalizeNemotronLanguage,
} from "@/lib/nemotronTranscribe";

describe("Nemotron Transcribe helpers", () => {
  it("normalizes BCP-47 language tags", () => {
    expect(normalizeNemotronLanguage("en-US")).toBe("en-US");
    expect(normalizeNemotronLanguage("fr")).toBe("fr");
  });

  it("picks file extension from mime type", () => {
    expect(extensionForMime("audio/webm;codecs=opus")).toBe("webm");
    expect(extensionForMime("audio/wav")).toBe("wav");
    expect(extensionForMime("audio/mpeg")).toBe("mp3");
  });

  it("extracts transcript from JSON payloads", () => {
    expect(extractNemotronTranscript({ text: "What time is check-in?" })).toBe(
      "What time is check-in?"
    );
    expect(extractNemotronTranscript("Hello there")).toBe("Hello there");
    expect(
      extractNemotronTranscript({
        results: [{ text: "Hello" }, { text: "there" }],
      })
    ).toBe("Hello there");
  });
});
