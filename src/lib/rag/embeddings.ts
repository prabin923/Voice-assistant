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
  const provider = getActiveAiProvider();
  if (provider === "openai") {
    const [vector] = await embedTexts([text]);
    return vector ?? [];
  }

  const model = getGenAI().getGenerativeModel({ model: GEMINI_EMBED_MODEL });
  const result = await model.embedContent({
    content: { role: "user", parts: [{ text }] },
    taskType: TaskType.RETRIEVAL_QUERY,
  });
  return result.embedding.values;
}
