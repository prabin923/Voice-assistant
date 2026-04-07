import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioBlob = formData.get('audio') as Blob;
    const language = formData.get('language') as string;

    if (!audioBlob) {
      return NextResponse.json({ error: 'No audio provided.' }, { status: 400 });
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY === 'your_gemini_api_key_here') {
      return NextResponse.json({ 
        error: 'Gemini API Key not configured.',
        details: 'Please add your GOOGLE_GENERATIVE_AI_API_KEY to the .env.local file to activate STT.'
      }, { status: 501 });
    }

    // Convert Blob to Base64 for Gemini
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    const prompt = `Transcribe this audio strictly. Language is ${language}. Only return the transcribed text, nothing else.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: audioBlob.type || 'audio/webm',
          data: base64Audio
        }
      }
    ]);

    const transcription = result.response.text().trim();
    return NextResponse.json({ text: transcription });

  } catch (error: any) {
    console.error('Gemini STT API Error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio with Gemini.', details: error.message },
      { status: 500 }
    );
  }
}
