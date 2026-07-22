import { ensureHotelConfigLoaded } from "@/lib/hotelConfig";
import { streamAssistantResponse } from "@/lib/responseEngine";
import { guests, ensureDbReady } from "@/lib/db";
import {
  handleGuestServiceFlow,
  shouldRunGuestServiceFlow,
  type PendingBooking,
  type PendingDining,
  type PendingSpa,
  type PendingServiceRequest,
} from "@/lib/guestServiceFlow";
import { runBookingAgent, AGENT_PENDING_BOOKING } from "@/lib/bookingAgent";
import type { EscalationReason } from "@/lib/escalation";
import { localizeServiceReply } from "@/lib/replyLocalize";
import { scheduleChatSideEffects } from "@/lib/chatSideEffects";
import { getClientIP } from "@/lib/rateLimit";
import { aiNotConfiguredResponse, isAiConfigured } from "@/lib/ai";
import { getGuestSession } from "@/lib/guestAuth";
import { checkGuestChatRateLimit } from "@/lib/guestRateLimit";
import { sanitizeChatHistory, sanitizeChatMessage } from "@/lib/chatValidation";
import { resolveSupportedLanguageCode } from "@/lib/languages";
import { normalizeHotelSlug } from "@/lib/slug";
import {
  runWithTenant,
  tenantSlugFromRequest,
  TenantNotFoundError,
} from "@/lib/tenantContext";

export const dynamic = "force-dynamic";

function encodeSse(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
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
    };

    const tenantSlug =
      normalizeHotelSlug(body.hotel) ?? tenantSlugFromRequest(req);

    return await runWithTenant({ slug: tenantSlug }, async () => {
      const ip = getClientIP(req);
      const guestSession = await getGuestSession();
      const [chatLimit, , guestRecord, config] = await Promise.all([
        checkGuestChatRateLimit({ ip, guestId: guestSession?.guestId }),
        ensureDbReady(),
        guestSession ? guests.findById(guestSession.guestId) : Promise.resolve(undefined),
        ensureHotelConfigLoaded(),
      ]);

      if (!chatLimit.allowed) {
        return new Response(
          encodeSse({ type: "error", error: "Rate limit exceeded." }),
          { status: 429, headers: { "Content-Type": "text/event-stream" } }
        );
      }

      const message = sanitizeChatMessage(body.message);
      if (!message) {
        return new Response(encodeSse({ type: "error", error: "Invalid message." }), {
          status: 400,
          headers: { "Content-Type": "text/event-stream" },
        });
      }

      if (!isAiConfigured()) {
        return new Response(encodeSse({ type: "error", ...aiNotConfiguredResponse() }), {
          status: 501,
          headers: { "Content-Type": "text/event-stream" },
        });
      }

      const langCode =
        resolveSupportedLanguageCode(body.language) ??
        resolveSupportedLanguageCode(config.language) ??
        "en-US";
      const conversationHistory = sanitizeChatHistory(body.history);
      const pendingBooking = body.pendingBooking ?? null;
      const pendingDining = body.pendingDining ?? null;
      const pendingSpa = body.pendingSpa ?? null;
      const pendingServiceRequest = body.pendingServiceRequest ?? null;
      const guestProfile = guestRecord
        ? {
            id: guestRecord.id,
            name: guestRecord.name,
            phone: guestRecord.phone,
            email: guestRecord.email,
            bookingCount: guestRecord.booking_count,
          }
        : undefined;

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const push = (data: unknown) => controller.enqueue(encoder.encode(encodeSse(data)));

          let reply = "";
          let escalate = false;
          let reason: EscalationReason | undefined;
          let booking: unknown;
          let dining: unknown;
          let nextPending: PendingBooking | null | undefined = pendingBooking;
          let nextDiningPending: PendingDining | null | undefined = pendingDining;
          let nextSpaPending: PendingSpa | null | undefined = pendingSpa;
          let nextServiceRequestPending: PendingServiceRequest | null | undefined = pendingServiceRequest;

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
            let agentReply = "";
            let agentBooking: unknown;
            let agentDining: unknown;
            let agentActive = false;
            let agentEscalate = false;
            let handled = false;

            try {
              // LLM receptionist agent (tools wrap real availability + booking).
              const agent = await runBookingAgent({
                message,
                langCode,
                config,
                history: conversationHistory,
                channel: body.channel === "voice" ? "voice" : "text",
                guestProfile,
              });
              agentReply = agent.reply;
              agentBooking = agent.booking;
              agentDining = agent.dining;
              // Spa and Service Request from agent
              const agentSpa = agent.spa;
              const agentServiceRequest = agent.serviceRequest;
              agentEscalate = agent.escalate;
              agentActive = agent.active;
              // Keep the agent engaged next turn while a booking is in progress.
              nextPending = agentActive ? AGENT_PENDING_BOOKING : null;
              nextDiningPending = null;
              nextSpaPending = null;
              nextServiceRequestPending = null;
              handled = true;
            } catch (err) {
              // Fall back to the deterministic flow (translated) if the agent fails.
              console.warn("[bookingAgent] stream failed, using deterministic flow:", err);
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
                agentReply = await localizeServiceReply(serviceFlow.reply || "", langCode);
                agentBooking = serviceFlow.booking;
                agentDining = serviceFlow.dining;
                agentEscalate = Boolean(serviceFlow.escalate);
                reason = serviceFlow.reason;
                nextPending = serviceFlow.pendingBooking;
                nextDiningPending = serviceFlow.pendingDining;
                nextSpaPending = serviceFlow.pendingSpa;
                nextServiceRequestPending = serviceFlow.pendingServiceRequest;
                handled = true;
              }
            }

            if (handled) {
              reply = agentReply;
              escalate = agentEscalate;
              booking = agentBooking;
              dining = agentDining;
              push({ type: "delta", text: reply });
              push({
                type: "done",
                reply,
                escalated: escalate,
                reason,
                booking,
                dining,
                pendingBooking: nextPending,
                pendingDining: nextDiningPending,
                pendingSpa: nextSpaPending,
                pendingServiceRequest: nextServiceRequestPending,
                agentActive,
              });
              scheduleChatSideEffects({
                guestMessage: message,
                aiResponse: reply,
                language: langCode,
                guestId: guestSession?.guestId,
                escalate,
                reason,
              });
              controller.close();
              return;
            }
          }

          for await (const chunk of streamAssistantResponse(
            message,
            langCode,
            conversationHistory,
            body.channel === "voice" ? "voice" : "text"
          )) {
            if (chunk.type === "delta") {
              push({ type: "delta", text: chunk.text });
            } else {
              reply = chunk.reply;
              escalate = chunk.escalate;
              reason = chunk.reason;
              push({
                type: "done",
                reply,
                escalated: escalate,
                reason,
                pendingBooking: nextPending,
                pendingDining: nextDiningPending,
                pendingSpa: nextSpaPending,
                pendingServiceRequest: nextServiceRequestPending,
                agentActive: false,
              });
            }
          }

          scheduleChatSideEffects({
            guestMessage: message,
            aiResponse: reply,
            language: langCode,
            guestId: guestSession?.guestId,
            escalate,
            reason: reason as Parameters<typeof scheduleChatSideEffects>[0]["reason"],
          });

          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    });
  } catch (error) {
    if (error instanceof TenantNotFoundError) {
      return new Response(encodeSse({ type: "error", error: "Hotel not found." }), {
        status: 404,
        headers: { "Content-Type": "text/event-stream" },
      });
    }
    console.error("Chat stream error:", error);
    return new Response(encodeSse({ type: "error", error: "Stream failed." }), {
      status: 500,
      headers: { "Content-Type": "text/event-stream" },
    });
  }
}
