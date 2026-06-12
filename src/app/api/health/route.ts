import { NextResponse } from "next/server";
import { isAiConfigured } from "@/lib/ai";
import { ensureDbReady } from "@/lib/db";
import { isNemotronAsrConfigured } from "@/lib/nemotronTranscribe";
import { isSelfHostedSttConfigured } from "@/lib/selfHostedStt";
import { isGeminiConfigured } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbOk = false;
  try {
    await ensureDbReady();
    dbOk = true;
  } catch {
    dbOk = false;
  }

  return NextResponse.json({
    ai: isAiConfigured(),
    db: dbOk,
    stt: isNemotronAsrConfigured() || isSelfHostedSttConfigured() || isGeminiConfigured(),
    sms: Boolean(process.env.TINGTING_API_KEY?.trim()),
    email: Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim()),
  });
}
