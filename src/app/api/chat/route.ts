import { NextResponse } from 'next/server';
import { getHotelConfig } from '@/lib/hotelConfig';
import { getAssistantResponse } from '@/lib/responseEngine';
import { interactions, supportTickets } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { message, language } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'A valid message string is required.' }, { status: 400 });
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY === 'your_gemini_api_key_here') {
      return NextResponse.json({
        error: 'Gemini API Key not configured.',
        details: 'Please add your GOOGLE_GENERATIVE_AI_API_KEY to the .env.local file to activate the assistant.'
      }, { status: 501 });
    }

    const config = getHotelConfig();
    const langCode = language || config.language || 'en-US';

    const startTime = Date.now();
    const { reply, escalate } = await getAssistantResponse(message, langCode);
    const responseTimeMs = Date.now() - startTime;

    // Log interaction for analytics
    try {
      interactions.log({ guestMessage: message, aiResponse: reply, language: langCode });
    } catch (e) {
      console.error("Failed to log interaction:", e);
    }

    // Auto-create support ticket on escalation
    let ticketId: string | undefined;
    if (escalate) {
      try {
        const ticket = supportTickets.create({ guestMessage: message, aiResponse: reply, language: langCode });
        ticketId = ticket.id;
        console.log(`[ESCALATION] Ticket ${ticket.id} created for: "${message.slice(0, 80)}..."`);
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
      { error: 'An error occurred while processing your request.', details: error.message },
      { status: 500 }
    );
  }
}
