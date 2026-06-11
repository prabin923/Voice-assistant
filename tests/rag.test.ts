import { describe, expect, it } from "vitest";
import { DEFAULT_HOTEL_CONFIG } from "@/lib/hotelConfig";
import { chunkHotelConfig } from "@/lib/rag/chunkHotelConfig";
import { cosineSimilarity } from "@/lib/rag/similarity";
import { contentHash } from "@/lib/rag/embeddings";

describe("chunkHotelConfig", () => {
  it("creates chunks for policies, rooms, and FAQ", () => {
    const chunks = chunkHotelConfig(DEFAULT_HOTEL_CONFIG);
    expect(chunks.some((c) => c.category === "policy")).toBe(true);
    expect(chunks.some((c) => c.category === "room")).toBe(true);
    expect(chunks.some((c) => c.category === "faq")).toBe(true);
    expect(chunks.some((c) => c.chunkKey === "contact:main")).toBe(true);
  });

  it("uses stable chunk keys", () => {
    const a = chunkHotelConfig(DEFAULT_HOTEL_CONFIG);
    const b = chunkHotelConfig(DEFAULT_HOTEL_CONFIG);
    expect(a.map((c) => c.chunkKey)).toEqual(b.map((c) => c.chunkKey));
  });
});

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });
});

describe("contentHash", () => {
  it("is stable for the same text", () => {
    expect(contentHash("pet policy")).toBe(contentHash("pet policy"));
    expect(contentHash("a")).not.toBe(contentHash("b"));
  });
});

describe("buildSystemInstruction (RAG)", () => {
  it("references per-turn hotel facts in the prompt", async () => {
    const { buildSystemInstruction } = await import("@/lib/responseEngine");
    const prompt = buildSystemInstruction("text");
    expect(prompt).toContain("HOTEL FACTS");
    expect(prompt).toContain("[ESCALATE]");
  });

  it("includes full hotel data when requested for live voice", async () => {
    const { buildSystemInstruction } = await import("@/lib/responseEngine");
    const prompt = buildSystemInstruction("voice", { fullHotelData: true });
    expect(prompt).toContain("HOTEL DATA");
  });
});
