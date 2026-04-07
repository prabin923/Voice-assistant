import { NextResponse } from 'next/server';
import { getAssistantResponse } from '@/lib/responseEngine';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    console.log('[Telephony Webhook] Received Event:', data);

    // Standard fields for most conversational AI telephony (TingTing/Twilio-like)
    // TingTing usually sends 'text' or 'transcript'
    const userInput = data.transcript || data.text || data.message;
    const callId = data.call_id || data.CallSid;
    const language = data.language || 'en-US';

    if (!userInput) {
      // If we get an empty event (e.g. call started), send a greeting
      if (data.event === 'call_started' || data.event === 'welcome') {
         return NextResponse.json({
           action: 'speak',
           text: "Hello! Welcome to the hotel. How can I assist you today?"
         });
      }
      return NextResponse.json({ status: 'ok', message: 'No input to process' });
    }

    // Get the response from our shared Gemini Brain
    const aiReply = await getAssistantResponse(userInput, language);

    // Return the response in a format TingTing/Twilio can "speak"
    // TingTing expects a simple JSON with a 'speak' or 'response' key
    return NextResponse.json({
      action: 'speak',
      text: aiReply,
      call_id: callId
    });

  } catch (error: any) {
    console.error('[Telephony Webhook] Error:', error);
    return NextResponse.json({
      action: 'speak',
      text: "I am sorry, I am experiencing a temporary connection issue. Please hold while I transfer you."
    }, { status: 200 }); // Always return 200 to keep the call alive if possible
  }
}
