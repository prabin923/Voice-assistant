import { NextResponse } from 'next/server';
import { getHotelConfig } from '@/lib/hotelConfig';
import { getAssistantResponse } from '@/lib/responseEngine';
import { interactions } from '@/lib/db';
import { notifyHotelStaff } from '@/lib/escalation';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';
import { aiNotConfiguredResponse, isAiConfigured } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Rate limit: 30 chat requests per minute per IP
    const ip = getClientIP(req);
    const limit = checkRateLimit(`chat:${ip}`, { maxRequests: 30, windowMs: 60000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
      );
    }

    const { message, language, history } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'A valid message string is required.' }, { status: 400 });
    }

    if (!isAiConfigured()) {
      return NextResponse.json(aiNotConfiguredResponse(), { status: 501 });
    }

    const config = getHotelConfig();
    const langCode = language || config.language || 'en-US';

    // Pass conversation history for multi-turn memory
    const conversationHistory = Array.isArray(history) ? history : [];

    const startTime = Date.now();
    const { reply, escalate, reason } = await getAssistantResponse(message, langCode, conversationHistory);
    const responseTimeMs = Date.now() - startTime;

    // Log interaction
    try {
      interactions.log({ guestMessage: message, aiResponse: reply, language: langCode });
    } catch (e) {
      console.error("Failed to log interaction:", e);
    }

    // Auto-create support ticket + email alert on escalation
    let ticketId: string | undefined;
    if (escalate) {
      ticketId = await notifyHotelStaff({
        guestMessage: message,
        aiResponse: reply,
        language: langCode,
        reason,
      });
    }

    return NextResponse.json({
      reply,
      escalated: escalate,
      ticketId,
      hotelName: config.branding.hotelName,
      language: langCode,
      responseTimeMs,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Gemini Chat API Error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request.' },
      { status: 500 }
    );
  }
}
