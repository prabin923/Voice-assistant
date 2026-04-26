import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

// SECURITY: Max audio file size (10MB)
const MAX_AUDIO_SIZE = 10 * 1024 * 1024;
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg",
  "audio/wav", "audio/x-wav", "audio/flac"
]);

export async function POST(req: Request) {
  try {
    // SECURITY: Rate limit STT (expensive Gemini calls) — 15 per minute
    const ip = getClientIP(req);
    const limit = checkRateLimit(`stt:${ip}`, { maxRequests: 15, windowMs: 60000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many transcription requests. Please wait." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
      );
    }

    const formData = await req.formData();
    const audioBlob = formData.get('audio') as Blob;
    const language = formData.get('language') as string;

    if (!audioBlob) {
      return NextResponse.json({ error: 'No audio provided.' }, { status: 400 });
    }

    // SECURITY: Validate file size
    if (audioBlob.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: `Audio file too large. Maximum size is ${MAX_AUDIO_SIZE / 1024 / 1024}MB.` },
        { status: 413 }
      );
    }

    // SECURITY: Validate MIME type
    const mimeType = audioBlob.type || "audio/webm";
    if (!ALLOWED_AUDIO_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported audio format: ${mimeType}` },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY === 'your_gemini_api_key_here') {
      return NextResponse.json({
        error: 'Gemini API Key not configured.',
      }, { status: 501 });
    }

    // Convert Blob to Base64 for Gemini
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    // Sanitize language input
    const safeLang = (language || "en-US").replace(/[^a-zA-Z0-9\-]/g, "").slice(0, 10);

    const prompt = `Transcribe this audio strictly. Language is ${safeLang}. Only return the transcribed text, nothing else.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: base64Audio
        }
      }
    ]);

    const transcription = result.response.text().trim();
    return NextResponse.json({ text: transcription });

  } catch (error: any) {
    console.error('Gemini STT API Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to transcribe audio.' },
      { status: 500 }
    );
  }
}
