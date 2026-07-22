import { NextResponse } from "next/server";
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
  type SpaSummary,
  type PendingSpa,
  type PendingServiceRequest,
} from '@/lib/guestServiceFlow';
import { runBookingAgent, AGENT_PENDING_BOOKING } from '@/lib/bookingAgent';
import { localizeServiceReply } from '@/lib/replyLocalize';
import { scheduleChatSideEffects } from '@/lib/chatSideEffects';
import { getClientIP } from '@/lib/rateLimit';
import { aiNotConfiguredResponse, isAiConfigured } from '@/lib/ai';
import { getGuestSession } from '@/lib/guestAuth';
import { checkGuestChatRateLimit } from '@/lib/guestRateLimit';
import { sanitizeChatHistory, sanitizeChatMessage } from '@/lib/chatValidation';
import { resolveSupportedLanguageCode } from '@/lib/languages';
import { normalizeHotelSlug } from '@/lib/slug';
import {
  runWithTenant,
  tenantSlugFromRequest,
  TenantNotFoundError,
} from '@/lib/tenantContext';

export const dynamic = 'force-dynamic';

export type { BookingSummary, DiningSummary };

export async function POST(req: Request) {
  try {
    const bodyPromise = req.json() as Promise<{
      message?: unknown;
      language?: string;
      history?: unknown;
      channel?: string;
      hotel?: string;
      pendingBooking?: PendingBooking | null;
      pendingDining?: PendingDining | null;
      pendingSpa?: PendingSpa | null;
      pendingServiceRequest?: PendingServiceRequest | null;
      agentActive?: boolean;
    }>;

    const [guestSession, body] = await Promise.all([getGuestSession(), bodyPromise]);
    const tenantSlug =
      normalizeHotelSlug(body.hotel) ?? tenantSlugFromRequest(req);

    return await runWithTenant({ slug: tenantSlug }, async () => {
    const ip = getClientIP(req);

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

    const langCode =
      resolveSupportedLanguageCode(body.language) ??
      resolveSupportedLanguageCode(config.language) ??
      'en-US';
    const conversationHistory = sanitizeChatHistory(body.history);

    const startTime = Date.now();
    let reply = "";
    let escalate = false;
    let reason: EscalationReason | undefined;
    let booking: BookingSummary | undefined;
    let dining: DiningSummary | undefined;
    let pendingBooking: PendingBooking | null | undefined = body.pendingBooking ?? null;
    let pendingDining: PendingDining | null | undefined = body.pendingDining ?? null;
    let pendingSpa: PendingSpa | null | undefined = body.pendingSpa ?? null;
    let pendingServiceRequest: PendingServiceRequest | null | undefined = body.pendingServiceRequest ?? null;

    const guestProfile = guestRecord
      ? {
          id: guestRecord.id,
          name: guestRecord.name,
          phone: guestRecord.phone,
          email: guestRecord.email,
          bookingCount: guestRecord.booking_count,
        }
      : undefined;

    // Booking/dining is handled by the LLM receptionist agent (tools wrap the
    // real availability + booking services). Engage it on booking/dining intent
    // or while a booking conversation is in progress (agentActive round-trip).
    let agentActive = false;
    const chatChannelEarly = body.channel === "voice" ? "voice" : "text";
    const engaged =
      body.agentActive === true ||
      shouldRunGuestServiceFlow(
        message,
        conversationHistory,
        langCode,
        config.rooms.map((r) => r.name),
        pendingBooking,
        pendingDining,
        pendingSpa,
        pendingServiceRequest
      );

    if (engaged) {
      try {
        const agent = await runBookingAgent({
          message,
          langCode,
          config,
          history: conversationHistory,
          channel: chatChannelEarly,
          guestProfile,
        });
        reply = agent.reply;
        escalate = agent.escalate;
        booking = agent.booking;
        dining = agent.dining;
        // Map agent.spa and agent.serviceRequest (for returning them in response)
        const agentSpa = agent.spa;
        const agentServiceRequest = agent.serviceRequest;
        agentActive = agent.active;
        // Keep the agent engaged on the next turn while a booking is in progress.
        pendingBooking = agentActive ? AGENT_PENDING_BOOKING : null;
        pendingDining = null;
        pendingSpa = null;
        pendingServiceRequest = null;
      } catch (err) {
        // Safety net: if the agent fails, fall back to the deterministic flow
        // (translated into the guest's language) so a booking still works.
        console.warn("[bookingAgent] failed, using deterministic flow:", err);
        const serviceFlow = await handleGuestServiceFlow({
          message,
          langCode,
          config,
          history: conversationHistory,
          guestProfile,
          pendingBooking,
          pendingDining,
          pendingSpa,
          pendingServiceRequest,
        });
        if (serviceFlow.handled) {
          reply = await localizeServiceReply(serviceFlow.reply || "I can help with that.", langCode);
          escalate = Boolean(serviceFlow.escalate);
          reason = serviceFlow.reason;
          booking = serviceFlow.booking;
          dining = serviceFlow.dining;
          if (serviceFlow.pendingBooking !== undefined) pendingBooking = serviceFlow.pendingBooking;
          if (serviceFlow.pendingDining !== undefined) pendingDining = serviceFlow.pendingDining;
          if (serviceFlow.pendingSpa !== undefined) pendingSpa = serviceFlow.pendingSpa;
          if (serviceFlow.pendingServiceRequest !== undefined) pendingServiceRequest = serviceFlow.pendingServiceRequest;
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
      pendingSpa: pendingSpa ?? null,
      pendingServiceRequest: pendingServiceRequest ?? null,
      agentActive,
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
    });
  } catch (error: unknown) {
    if (error instanceof TenantNotFoundError) {
      return NextResponse.json({ error: "Hotel not found." }, { status: 404 });
    }
    console.error('Gemini Chat API Error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request.' },
      { status: 500 }
    );
  }
}
