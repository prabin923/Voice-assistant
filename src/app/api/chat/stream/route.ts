import { ensureHotelConfigLoaded } from "@/lib/hotelConfig";
import { streamAssistantResponse } from "@/lib/responseEngine";
import { guests, ensureDbReady } from "@/lib/db";
import {
  handleGuestBookingFlow,
  shouldRunBookingFlow,
  type PendingBooking,
} from "@/lib/bookingFlow";
import { scheduleChatSideEffects } from "@/lib/chatSideEffects";
import { getClientIP } from "@/lib/rateLimit";
import { aiNotConfiguredResponse, isAiConfigured } from "@/lib/ai";
import { getGuestSession } from "@/lib/guestAuth";
import { checkGuestChatRateLimit } from "@/lib/guestRateLimit";
import { sanitizeChatHistory, sanitizeChatMessage } from "@/lib/chatValidation";

export const dynamic = "force-dynamic";

function encodeSse(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  try {
    const ip = getClientIP(req);
    const body = (await req.json()) as {
      message?: unknown;
      language?: string;
      history?: unknown;
      channel?: string;
      pendingBooking?: PendingBooking | null;
    };

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

    const langCode = body.language || config.language || "en-US";
    const conversationHistory = sanitizeChatHistory(body.history);
    const pendingBooking = body.pendingBooking ?? null;
    const guestProfile = guestRecord
      ? {
          id: guestRecord.id,
          name: guestRecord.name,
          phone: guestRecord.phone,
          email: guestRecord.email,
        }
      : undefined;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const push = (data: unknown) => controller.enqueue(encoder.encode(encodeSse(data)));

        let reply = "";
        let escalate = false;
        let reason: string | undefined;
        let booking: unknown;
        let nextPending: PendingBooking | null | undefined = pendingBooking;

        const runBooking = shouldRunBookingFlow(
          message,
          conversationHistory,
          langCode,
          config.rooms.map((r) => r.name),
          pendingBooking
        );

        if (runBooking) {
          const bookingFlow = await handleGuestBookingFlow({
            message,
            langCode,
            config,
            history: conversationHistory,
            guestProfile,
            pendingBooking,
          });

          if (bookingFlow.handled) {
            reply = bookingFlow.reply || "";
            escalate = Boolean(bookingFlow.escalate);
            reason = bookingFlow.reason;
            booking = bookingFlow.booking;
            nextPending = bookingFlow.pendingBooking;
            push({ type: "delta", text: reply });
            push({
              type: "done",
              reply,
              escalated: escalate,
              reason,
              booking,
              pendingBooking: nextPending,
            });
            scheduleChatSideEffects({
              guestMessage: message,
              aiResponse: reply,
              language: langCode,
              guestId: guestSession?.guestId,
              escalate,
              reason: bookingFlow.reason,
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
  } catch (error) {
    console.error("Chat stream error:", error);
    return new Response(encodeSse({ type: "error", error: "Stream failed." }), {
      status: 500,
      headers: { "Content-Type": "text/event-stream" },
    });
  }
}
