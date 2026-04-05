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

    if (!audioBlob) {
      return NextResponse.json({ error: 'No audio provided.' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API Key not configured.' }, { status: 501 });
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
