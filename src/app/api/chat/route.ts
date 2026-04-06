import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getHotelConfig } from '@/lib/hotelConfig';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(req: Request) {
  try {
    const { message, language } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'A valid message string is required.' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      return NextResponse.json({ 
        error: 'OpenAI API Key not configured.',
        details: 'Please add your OPENAI_API_KEY to the .env.local file. If you haven\'t yet, rename the template I created earlier.'
      }, { status: 501 });
    }

    const config = getHotelConfig();
    const langCode = language || config.language || 'en-US';

    const systemPrompt = `
      You are the AI Receptionist for ${config.branding.hotelName}. 
      Your Persona: ${config.receptionistPersona}.
      Hotel Policies: ${config.policies}.
      Amenities: ${config.amenities.join(', ')}.
      Language: Respond strictly in the language requested (${langCode}).
      Tone: Professional, helpful, and hospitable.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const reply = completion.choices[0].message.content || "I apologize, but I am unable to process that right now.";

    return NextResponse.json({
      reply,
      hotelName: config.branding.hotelName,
      language: langCode,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('OpenAI Chat API Error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request.', details: error.message },
      { status: 500 }
    );
  }
}
