// ============================================================
// UNIVERSAL CHAT API — /api/chat
// ============================================================
// Accepts a user message, generates a contextual reply using
// the current hotel configuration. Ready for integration with
// any hotel management system.
// ============================================================

import { NextResponse } from 'next/server';
import { getHotelConfig } from '@/lib/hotelConfig';
import { generateResponse } from '@/lib/responseEngine';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'A valid message string is required.' },
        { status: 400 }
      );
    }

    const config = getHotelConfig();

    // Simulate slight processing delay for realism
    await new Promise(resolve => setTimeout(resolve, 400));

    const reply = generateResponse(message, config);

    return NextResponse.json({
      reply,
      hotelName: config.branding.hotelName,
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
