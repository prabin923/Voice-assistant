import { NextResponse } from 'next/server';
import { getHotelConfig } from '@/lib/hotelConfig';
import { getAssistantResponse } from '@/lib/responseEngine';

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

    const reply = await getAssistantResponse(message, langCode);

    return NextResponse.json({
      reply,
      hotelName: config.branding.hotelName,
      language: langCode,
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
