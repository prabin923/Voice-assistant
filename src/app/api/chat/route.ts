import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getHotelConfig } from '@/lib/hotelConfig';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

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

    const systemPrompt = `
      You are the AI Receptionist for ${config.branding.hotelName}. 
      Your Persona: ${config.receptionistPersona}.
      Hotel Policies: ${config.policies}.
      Amenities: ${config.amenities.map(a => a.name).join(', ')}.
      Language: Respond strictly in the language requested (${langCode}).
      Tone: Professional, helpful, and hospitable.
    `;

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Acknowledged. I am the receptionist for " + config.branding.hotelName + ". How can I help you today?" }] },
      ],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const reply = response.text() || "I apologize, but I am unable to process that right now.";

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
