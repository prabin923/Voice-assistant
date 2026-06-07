import { NextResponse } from 'next/server';
import { getAssistantResponse } from '@/lib/responseEngine';
import { handleGuestBookingFlow } from '@/lib/bookingFlow';
import { ensureHotelConfigLoaded } from '@/lib/hotelConfig';
import { notifyHotelStaff, type EscalationReason } from '@/lib/escalation';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

// SECURITY: Verify webhook requests via shared secret
function verifyWebhookAuth(req: Request): boolean {
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (!webhookSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[Telephony Webhook] CRITICAL: WEBHOOK_SECRET not set in production!");
      return false;
    }
    console.warn("[Telephony Webhook] WARNING: WEBHOOK_SECRET not set — accepting all requests for local development.");
    return true;
  }

  const authHeader = req.headers.get("x-webhook-secret") || req.headers.get("authorization");
  if (!authHeader) return false;

  // Support both "Bearer <secret>" and raw secret
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  return token === webhookSecret;
}

export async function POST(req: Request) {
  // SECURITY: Verify the request comes from a trusted source
  if (!verifyWebhookAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit webhook requests
  const ip = getClientIP(req);
  const limit = checkRateLimit(`webhook:${ip}`, { maxRequests: 60, windowMs: 60000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { action: 'speak', text: 'Please hold, our system is busy.' },
      { status: 429 }
    );
  }

  try {
    const data = await req.json();
    console.log('[Telephony Webhook] Received Event:', data.event || 'message');

    const userInput = data.transcript || data.text || data.message;
    const callId = data.call_id || data.CallSid;
    const language = data.language || 'en-US';

    if (!userInput) {
      if (data.event === 'call_started' || data.event === 'welcome') {
         return NextResponse.json({
           action: 'speak',
           text: "Hello! Welcome to the hotel. How can I assist you today?"
         });
      }
      return NextResponse.json({ status: 'ok', message: 'No input to process' });
    }

    // Limit input length
    const sanitizedInput = typeof userInput === 'string' ? userInput.slice(0, 500) : '';
    if (!sanitizedInput) {
      return NextResponse.json({ action: 'speak', text: 'I didn\'t catch that. Could you repeat?' });
    }

    const config = await ensureHotelConfigLoaded();
    const bookingFlow = await handleGuestBookingFlow({
      message: sanitizedInput,
      langCode: language,
      config,
      history: [],
    });

    let aiReply: string;
    let escalate = false;
    let reason: EscalationReason | undefined;

    if (bookingFlow.handled) {
      aiReply = bookingFlow.reply || "I can help with that booking.";
      escalate = Boolean(bookingFlow.escalate);
      reason = bookingFlow.reason;
    } else {
      const result = await getAssistantResponse(sanitizedInput, language, [], "voice");
      aiReply = result.reply;
      escalate = result.escalate;
      reason = result.reason;
    }

    if (escalate) {
      await notifyHotelStaff({
        guestMessage: sanitizedInput,
        aiResponse: aiReply,
        language,
        reason,
      });
    }

    return NextResponse.json({
      action: 'speak',
      text: aiReply,
      call_id: callId
    });

  } catch (error: any) {
    console.error('[Telephony Webhook] Error:', error.message);
    return NextResponse.json({
      action: 'speak',
      text: "I am sorry, I am experiencing a temporary issue. Please hold while I transfer you."
    }, { status: 200 });
  }
}
