import { createHash } from "crypto";
import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import OpenAI from "openai";
import { getActiveAiProvider } from "@/lib/ai";
import { getGeminiApiKey } from "@/lib/gemini";
import { getOpenAiApiKey } from "@/lib/openai";

const GEMINI_EMBED_MODEL = "text-embedding-004";
const OPENAI_EMBED_MODEL = "text-embedding-3-small";

let genAiSingleton: GoogleGenerativeAI | null = null;
let openAiSingleton: OpenAI | null = null;

const queryEmbedCache = new Map<string, number[]>();
const QUERY_EMBED_CACHE_MAX = 64;

export function contentHash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export function activeEmbedModel(): string {
  const provider = getActiveAiProvider();
  return provider === "openai" ? OPENAI_EMBED_MODEL : GEMINI_EMBED_MODEL;
}

function getGenAI() {
  if (!genAiSingleton) {
    genAiSingleton = new GoogleGenerativeAI(getGeminiApiKey() || "");
  }
  return genAiSingleton;
}

function getOpenAI() {
  if (!openAiSingleton) {
    openAiSingleton = new OpenAI({ apiKey: getOpenAiApiKey() });
  }
  return openAiSingleton;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  const provider = getActiveAiProvider();
  if (provider === "openai") {
    const res = await getOpenAI().embeddings.create({
      model: OPENAI_EMBED_MODEL,
      input: texts,
    });
    return res.data.map((row) => row.embedding);
  }

  const model = getGenAI().getGenerativeModel({ model: GEMINI_EMBED_MODEL });
  const vectors: number[][] = [];
  for (const text of texts) {
    const result = await model.embedContent({
      content: { role: "user", parts: [{ text }] },
      taskType: TaskType.RETRIEVAL_DOCUMENT,
    });
    vectors.push(result.embedding.values);
  }
  return vectors;
}

export async function embedQuery(text: string): Promise<number[]> {
  if (!text.trim()) return [];

  const cacheKey = contentHash(text.trim().toLowerCase());
  const cached = queryEmbedCache.get(cacheKey);
  if (cached) return cached;

  const provider = getActiveAiProvider();
  let vector: number[] = [];
  if (provider === "openai") {
    const [embedded] = await embedTexts([text]);
    vector = embedded ?? [];
  } else {
    const model = getGenAI().getGenerativeModel({ model: GEMINI_EMBED_MODEL });
    const result = await model.embedContent({
      content: { role: "user", parts: [{ text }] },
      taskType: TaskType.RETRIEVAL_QUERY,
    });
    vector = result.embedding.values;
  }

  if (vector.length) {
    queryEmbedCache.set(cacheKey, vector);
    if (queryEmbedCache.size > QUERY_EMBED_CACHE_MAX) {
      const oldest = queryEmbedCache.keys().next().value;
      if (oldest) queryEmbedCache.delete(oldest);
    }
  }
  return vector;
}
