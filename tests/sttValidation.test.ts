import { describe, expect, it } from "vitest";
import { isJunkTranscription, sanitizeTranscription } from "@/lib/sttValidation";

describe("sttValidation", () => {
  it("flags Gemini/meta hallucination transcripts", () => {
    expect(
      isJunkTranscription("Please provide the audio file or link you would like me to transcribe.")
    ).toBe(true);
    expect(isJunkTranscription("Transcribe this audio strictly.")).toBe(true);
  });

  it("accepts normal guest speech", () => {
    expect(isJunkTranscription("What time is check-in?")).toBe(false);
    expect(isJunkTranscription("Can I book a deluxe room for Friday?")).toBe(false);
  });

  it("normalizes whitespace", () => {
    expect(sanitizeTranscription("  hello   there  ")).toBe("hello there");
  });
});
