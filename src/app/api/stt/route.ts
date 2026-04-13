import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioBlob = formData.get('audio') as Blob;
    const language = formData.get('language') as string;

    if (!audioBlob) {
      return NextResponse.json({ error: 'No audio provided.' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        error: 'OpenAI API Key not configured.',
        details: 'Please add your OPENAI_API_KEY to .env.local to activate STT.'
      }, { status: 501 });
    }

    // Convert Blob to File for Whisper API
    const arrayBuffer = await audioBlob.arrayBuffer();
    const file = new File([arrayBuffer], "audio.webm", { type: audioBlob.type || "audio/webm" });

    // Extract 2-letter language code for Whisper (e.g., "en-US" -> "en")
    const langCode = language ? language.split('-')[0] : undefined;

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: langCode,
    });

    return NextResponse.json({ text: transcription.text });

  } catch (error: any) {
    console.error('Whisper STT API Error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio.', details: error.message },
      { status: 500 }
    );
  }
}
