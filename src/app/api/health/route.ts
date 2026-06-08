import { NextResponse } from "next/server";
import { isAiConfigured } from "@/lib/ai";
import { ensureDbReady } from "@/lib/db";

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
    stt: Boolean(
      process.env.AZURE_SPEECH_KEY?.trim() ||
        process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
        process.env.OPENAI_API_KEY?.trim()
    ),
    sms: Boolean(process.env.TINGTING_API_KEY?.trim()),
    email: Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim()),
  });
}
