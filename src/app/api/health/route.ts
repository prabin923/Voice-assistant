import { NextResponse } from "next/server";
import { isAiConfigured } from "@/lib/ai";
import { isGeminiConfigured, isSttConfigured } from "@/lib/gemini";
import { isOpenAiConfigured } from "@/lib/openai";
import { isSelfHostedSttConfigured } from "@/lib/selfHostedStt";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({
    openai: isOpenAiConfigured(),
    gemini: isGeminiConfigured(),
    ai: isAiConfigured(),
    stt: isSttConfigured(),
    selfHostedStt: isSelfHostedSttConfigured(),
    env: process.env.VERCEL ? "vercel" : process.env.NODE_ENV ?? "development",
  });
}
