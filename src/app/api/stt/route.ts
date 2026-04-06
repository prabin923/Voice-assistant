import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioBlob = formData.get('audio') as Blob;
    const language = formData.get('language') as string;

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      return NextResponse.json({ 
        error: 'OpenAI API Key not configured.',
        details: 'Please add your OPENAI_API_KEY to the .env.local file. STT (Whisper) cannot run without it.'
      }, { status: 501 });
    }

    // Convert Blob to File object for OpenAI
    const file = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });

    // Send to Whisper
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: language.split('-')[0], // Whisper prefers 'en' over 'en-US'
    });

    return NextResponse.json({ text: transcription.text });

  } catch (error: any) {
    console.error('STT API Error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio.', details: error.message },
      { status: 500 }
    );
  }
}
