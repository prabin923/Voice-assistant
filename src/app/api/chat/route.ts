// ============================================================
// UNIVERSAL CHAT API — /api/chat
// ============================================================
// Accepts a user message + optional language code, generates
// a contextual reply using the hotel config and response engine.
// ============================================================

import { NextResponse } from 'next/server';
import { getHotelConfig } from '@/lib/hotelConfig';
import { generateResponse } from '@/lib/responseEngine';

export async function POST(req: Request) {
  try {
    const { message, language } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'A valid message string is required.' },
        { status: 400 }
      );
    }

    const config = getHotelConfig();
    const langCode = language || config.language || 'en-US';

    // Simulate slight processing delay for realism
    await new Promise(resolve => setTimeout(resolve, 300));

    const reply = generateResponse(message, config, langCode);

    return NextResponse.json({
      reply,
      hotelName: config.branding.hotelName,
      language: langCode,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request.' },
      { status: 500 }
    );
  }
}
