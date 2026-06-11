import { NextResponse } from 'next/server';
import { ensureHotelConfigLoaded } from '@/lib/hotelConfig';
import { getAssistantResponse } from '@/lib/responseEngine';
import { guests, ensureDbReady } from '@/lib/db';
import type { EscalationReason } from '@/lib/escalation';
import {
  handleGuestServiceFlow,
  shouldRunGuestServiceFlow,
  type BookingSummary,
  type DiningSummary,
  type PendingBooking,
  type PendingDining,
} from '@/lib/guestServiceFlow';
import { scheduleChatSideEffects } from '@/lib/chatSideEffects';
import { getClientIP } from '@/lib/rateLimit';
import { aiNotConfiguredResponse, isAiConfigured } from '@/lib/ai';
import { getGuestSession } from '@/lib/guestAuth';
import { checkGuestChatRateLimit } from '@/lib/guestRateLimit';
import { sanitizeChatHistory, sanitizeChatMessage } from '@/lib/chatValidation';

export const dynamic = 'force-dynamic';

export type { BookingSummary, DiningSummary };

export async function POST(req: Request) {
  try {
    const ip = getClientIP(req);
    const bodyPromise = req.json() as Promise<{
      message?: unknown;
      language?: string;
      history?: unknown;
      channel?: string;
      pendingBooking?: PendingBooking | null;
      pendingDining?: PendingDining | null;
    }>;

    const [guestSession, body] = await Promise.all([getGuestSession(), bodyPromise]);

    const chatLimitPromise = checkGuestChatRateLimit({
      ip,
      guestId: guestSession?.guestId,
    });

    const dbPromise = ensureDbReady();
    const guestRecordPromise = guestSession
      ? guests.findById(guestSession.guestId)
      : Promise.resolve(undefined);

    const [chatLimit, , guestRecord, config] = await Promise.all([
      chatLimitPromise,
      dbPromise,
      guestRecordPromise,
      ensureHotelConfigLoaded(),
    ]);

    if (!chatLimit.allowed) {
      const message =
        chatLimit.reason === "daily"
          ? guestSession
            ? "You have reached today's message limit. Please try again tomorrow."
            : "Daily guest limit reached. Sign in for a higher limit and saved profile."
          : "Too many requests. Please wait a moment.";
      return NextResponse.json(
        {
          error: message,
          requiresGuestAuth: Boolean(chatLimit.requiresAuth),
        },
        {
          status: 429,
          headers: chatLimit.retryAfterMs
            ? { "Retry-After": String(Math.ceil(chatLimit.retryAfterMs / 1000)) }
            : undefined,
        }
      );
    }

    const message = sanitizeChatMessage(body.message);
    if (!message) {
      return NextResponse.json({ error: 'A valid message string is required.' }, { status: 400 });
    }

    if (!isAiConfigured()) {
      return NextResponse.json(aiNotConfiguredResponse(), { status: 501 });
    }

    const langCode = body.language || config.language || 'en-US';
    const conversationHistory = sanitizeChatHistory(body.history);

    const startTime = Date.now();
    let reply = "";
    let escalate = false;
    let reason: EscalationReason | undefined;
    let booking: BookingSummary | undefined;
    let dining: DiningSummary | undefined;
    let pendingBooking: PendingBooking | null | undefined = body.pendingBooking ?? null;
    let pendingDining: PendingDining | null | undefined = body.pendingDining ?? null;

    const guestProfile = guestRecord
      ? {
          id: guestRecord.id,
          name: guestRecord.name,
          phone: guestRecord.phone,
          email: guestRecord.email,
        }
      : undefined;

    const runServiceFlow = shouldRunGuestServiceFlow(
      message,
      conversationHistory,
      langCode,
      config.rooms.map((r) => r.name),
      pendingBooking,
      pendingDining
    );

    if (runServiceFlow) {
      const serviceFlow = await handleGuestServiceFlow({
        message,
        langCode,
        config,
        history: conversationHistory,
        guestProfile,
        pendingBooking,
        pendingDining,
      });

      if (serviceFlow.handled) {
        reply = serviceFlow.reply || "I can help with that.";
        escalate = Boolean(serviceFlow.escalate);
        reason = serviceFlow.reason;
        booking = serviceFlow.booking;
        dining = serviceFlow.dining;
        if (serviceFlow.pendingBooking !== undefined) {
          pendingBooking = serviceFlow.pendingBooking;
        }
        if (serviceFlow.pendingDining !== undefined) {
          pendingDining = serviceFlow.pendingDining;
        }
      }
    }

    if (!reply) {
      const chatChannel = body.channel === "voice" ? "voice" : "text";
      const aiResult = await getAssistantResponse(message, langCode, conversationHistory, chatChannel);
      reply = aiResult.reply;
      escalate = aiResult.escalate;
      reason = aiResult.reason;
    }

    const responseTimeMs = Date.now() - startTime;

    scheduleChatSideEffects({
      guestMessage: message,
      aiResponse: reply,
      language: langCode,
      guestId: guestSession?.guestId,
      escalate,
      reason,
    });

    return NextResponse.json({
      reply,
      escalated: escalate,
      booking,
      dining,
      pendingBooking: pendingBooking ?? null,
      pendingDining: pendingDining ?? null,
      guest: guestRecord
        ? {
            name: guestRecord.name,
            loyaltyTier:
              guestRecord.visit_count >= 10
                ? "loyal"
                : guestRecord.visit_count >= 2
                  ? "returning"
                  : "new",
          }
        : undefined,
      hotelName: config.branding.hotelName,
      language: langCode,
      responseTimeMs,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Gemini Chat API Error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request.' },
      { status: 500 }
    );
  }
}
