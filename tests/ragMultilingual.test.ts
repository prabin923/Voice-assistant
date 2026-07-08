import { describe, it, expect } from "vitest";
import {
  queryTokens,
  lexicalRetrieve,
  hasNonLatinScript,
  adaptiveMinScore,
  selectByScore,
  type ScorableChunk,
} from "../src/lib/rag/lexical";

const rows: ScorableChunk[] = [
  { chunkKey: "amenity:wifi", category: "amenity", title: "WiFi", content: "Complimentary high-speed WiFi in all rooms." },
  { chunkKey: "faq:airport", category: "faq", title: "Airport pickup", content: "We offer airport pickup for USD 25 on request." },
  { chunkKey: "web:ne:1", category: "website", title: "सेवाहरू", content: "हाम्रो होटलमा निःशुल्क वाइफाइ र एयरपोर्ट पिकअप सेवा उपलब्ध छ।" },
];

describe("RAG multilingual tokenizer", () => {
  it("tokenizes Nepali (Devanagari) instead of returning []", () => {
    expect(queryTokens("तपाईंको होटलमा वाइफाइ छ?").length).toBeGreaterThanOrEqual(2);
  });
  it("still tokenizes English and drops stop words", () => {
    const t = queryTokens("do you have wifi in the room");
    expect(t).toContain("wifi");
    expect(t).not.toContain("you");
  });
});

describe("script detection", () => {
  it("flags non-Latin scripts", () => {
    expect(hasNonLatinScript("वाइफाइ छ")).toBe(true);
    expect(hasNonLatinScript("wifi वाइफाइ")).toBe(true);
  });
  it("does not flag plain English", () => {
    expect(hasNonLatinScript("do you have wifi?")).toBe(false);
  });
});

describe("lexical retrieval is script-agnostic", () => {
  it("matches a Nepali query against Nepali content", () => {
    expect(lexicalRetrieve(rows, "वाइफाइ", 3, 0.34)[0]?.chunkKey).toBe("web:ne:1");
  });
  it("matches an English query against English content", () => {
    expect(lexicalRetrieve(rows, "airport pickup service", 3, 0.34).map((r) => r.chunkKey))
      .toContain("faq:airport");
  });
});

describe("adaptive threshold + soft floor (anti metadata-only)", () => {
  it("relaxes the threshold for non-Latin queries only", () => {
    expect(adaptiveMinScore("वाइफाइ", 0.32)).toBeLessThanOrEqual(0.2);
    expect(adaptiveMinScore("wifi", 0.32)).toBe(0.32);
  });
  it("returns the best real chunk when nothing clears the bar but a candidate is above the floor", () => {
    const scored = rows.map((r, i) => ({ ...r, score: [0.22, 0.19, 0.1][i] }));
    const got = selectByScore(scored, { minScore: 0.32, floor: 0.18, topK: 3 });
    expect(got).toHaveLength(1);
    expect(got[0].chunkKey).toBe("amenity:wifi");
  });
  it("returns [] when every candidate is below the floor (lets the model decline)", () => {
    const scored = rows.map((r) => ({ ...r, score: 0.05 }));
    expect(selectByScore(scored, { minScore: 0.32, floor: 0.18, topK: 3 })).toHaveLength(0);
  });
  it("returns all above-threshold candidates, ranked, in the normal case", () => {
    const scored = rows.map((r, i) => ({ ...r, score: [0.5, 0.4, 0.33][i] }));
    const got = selectByScore(scored, { minScore: 0.32, floor: 0.18, topK: 3 });
    expect(got).toHaveLength(3);
    expect(got[0].score).toBe(0.5);
  });
});
