import { NextResponse } from 'next/server';
import { getHotelConfig } from '@/lib/hotelConfig';
import { getAssistantResponse } from '@/lib/responseEngine';
import { interactions, supportTickets } from '@/lib/db';
import { sendEscalationEmail } from '@/lib/email';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

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

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY === 'your_gemini_api_key_here') {
      return NextResponse.json({
        error: 'Gemini API Key not configured.',
        details: 'Please add your GOOGLE_GENERATIVE_AI_API_KEY to .env.local'
      }, { status: 501 });
    }

    const config = getHotelConfig();
    const langCode = language || config.language || 'en-US';

    // Pass conversation history for multi-turn memory
    const conversationHistory = Array.isArray(history) ? history : [];

    const startTime = Date.now();
    const { reply, escalate } = await getAssistantResponse(message, langCode, conversationHistory);
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
      try {
        const ticket = supportTickets.create({ guestMessage: message, aiResponse: reply, language: langCode });
        ticketId = ticket.id;
        console.log(`[ESCALATION] Ticket ${ticket.id} created for: "${message.slice(0, 80)}..."`);

        // Send email alert to staff (non-blocking)
        sendEscalationEmail({
          ticketId: ticket.id,
          guestMessage: message,
          aiResponse: reply,
          language: langCode,
          hotelName: config.branding.hotelName,
          staffEmail: config.contact.email,
        }).catch(err => console.error("[EMAIL] Failed to send escalation alert:", err));
      } catch (e) {
        console.error("Failed to create support ticket:", e);
      }
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
