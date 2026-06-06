import { NextResponse } from 'next/server';
import { getHotelConfig } from '@/lib/hotelConfig';
import { getAssistantResponse } from '@/lib/responseEngine';
import { availability, bookings, guests, interactions } from '@/lib/db';
import { notifyHotelStaff, type EscalationReason } from '@/lib/escalation';
import { getClientIP } from '@/lib/rateLimit';
import { aiNotConfiguredResponse, isAiConfigured } from '@/lib/ai';
import { getKeywordsForLanguage } from '@/lib/languages';
import { getGuestSession } from '@/lib/guestAuth';
import { checkGuestChatRateLimit } from '@/lib/guestRateLimit';

export const dynamic = 'force-dynamic';

type ChatHistoryMessage = { role: "user" | "assistant"; content: string };

function addDays(isoDate: string, days: number): string {
  const base = new Date(`${isoDate}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function parseMonthNameDate(text: string): string[] {
  const matches: string[] = [];
  const monthRegex =
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:,\s*(\d{4}))?\b/gi;
  let m: RegExpExecArray | null;
  while ((m = monthRegex.exec(text)) !== null) {
    const year = Number(m[3] || new Date().getUTCFullYear());
    const parsed = new Date(`${m[1]} ${m[2]}, ${year} UTC`);
    if (!Number.isNaN(parsed.getTime())) {
      matches.push(parsed.toISOString().slice(0, 10));
    }
  }
  return matches;
}

function detectDateRange(message: string, history: ChatHistoryMessage[]): {
  checkIn?: string;
  checkOut?: string;
  parseFailed: boolean;
} {
  const source = `${history.map((h) => h.content).join(" ")} ${message}`.toLowerCase();
  const iso = source.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? [];
  const named = parseMonthNameDate(source);
  const combined = [...iso, ...named];

  if (source.includes("tomorrow")) {
    const tomorrow = addDays(new Date().toISOString().slice(0, 10), 1);
    combined.push(tomorrow);
  }
  if (source.includes("today")) {
    combined.push(new Date().toISOString().slice(0, 10));
  }

  const unique = [...new Set(combined)].sort();
  if (unique.length >= 2) {
    return { checkIn: unique[0], checkOut: unique[1], parseFailed: false };
  }
  if (unique.length === 1 && source.includes("night")) {
    return { checkIn: unique[0], checkOut: addDays(unique[0], 1), parseFailed: false };
  }

  const hasDateHint = /\b\d{1,2}[-/]\d{1,2}\b/.test(source) || /\bfrom\b|\bto\b|\buntil\b/.test(source);
  return { parseFailed: hasDateHint };
}

function detectRoomType(message: string, history: ChatHistoryMessage[], roomNames: string[]): string | null {
  const source = `${history.map((h) => h.content).join(" ")} ${message}`.toLowerCase();
  for (const roomName of roomNames) {
    if (source.includes(roomName.toLowerCase())) {
      return roomName;
    }
  }
  return null;
}

function extractGuestDetails(message: string, history: ChatHistoryMessage[]): {
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
} {
  const source = `${history.map((h) => h.content).join(" ")} ${message}`;
  const emailMatch = source.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/);
  const phoneMatch = source.match(/(\+?\d[\d\s\-()]{7,}\d)/);
  const nameMatch = source.match(/\b(?:my name is|name is|i am)\s+([A-Za-z][A-Za-z\s.'-]{1,60})/i);
  return {
    guestName: nameMatch?.[1]?.trim(),
    guestPhone: phoneMatch?.[1]?.replace(/\s+/g, " ").trim(),
    guestEmail: emailMatch?.[0]?.trim(),
  };
}

function isBookingIntent(message: string, langCode: string): boolean {
  const keywords = getKeywordsForLanguage(langCode).booking;
  const lower = message.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

function serializeBookingReply(input: {
  hotelName: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guestName: string;
  bookingId: string;
}): string {
  return `Great news — your booking is confirmed at ${input.hotelName}. Booking ID: ${input.bookingId.slice(0, 8)}. ${input.rooms} ${input.roomType} room(s) from ${input.checkIn} to ${input.checkOut} for ${input.guestName}.`;
}

export type BookingSummary = {
  id: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  status: string;
};

async function buildBookingReply(params: {
  message: string;
  langCode: string;
  config: ReturnType<typeof getHotelConfig>;
  history: ChatHistoryMessage[];
  guestProfile?: { id: string; name: string; phone: string | null; email: string };
}): Promise<{
  handled: boolean;
  reply?: string;
  escalate?: boolean;
  reason?: EscalationReason;
  booking?: BookingSummary;
}> {
  const { message, langCode, config, history, guestProfile } = params;
  if (!isBookingIntent(message, langCode)) return { handled: false };

  const roomNames = config.rooms.map((room) => room.name);
  const roomType = detectRoomType(message, history, roomNames);
  const dateRange = detectDateRange(message, history);

  if (dateRange.parseFailed) {
    return {
      handled: true,
      reply:
        "I could not reliably parse your dates for booking. I will connect you to our front desk so we can complete this correctly.",
      escalate: true,
      reason: "ai_flagged",
    };
  }

  if (!dateRange.checkIn || !dateRange.checkOut) {
    return {
      handled: true,
      reply:
        "Sure, I can help with that booking. Please share your check-in and check-out dates in YYYY-MM-DD format.",
      escalate: false,
    };
  }

  const availabilityByRoom = config.rooms.map((room) => ({
    roomType: room.name,
    available: availability.get(room.name, dateRange.checkIn!, dateRange.checkOut!).available,
  }));

  if (!roomType) {
    const availableRooms = availabilityByRoom.filter((item) => item.available > 0);
    if (!availableRooms.length) {
      return {
        handled: true,
        reply:
          "We are sold out for those dates. I will notify our front desk team to help with alternatives.",
        escalate: true,
        reason: "ai_flagged",
      };
    }
    const list = availableRooms
      .slice(0, 5)
      .map((item) => `${item.roomType} (${item.available} left)`)
      .join(", ");
    return {
      handled: true,
      reply: `For ${dateRange.checkIn} to ${dateRange.checkOut}, we currently have: ${list}. Which room type would you like to book?`,
      escalate: false,
    };
  }

  const selectedAvailability = availabilityByRoom.find((item) => item.roomType === roomType);
  if (!selectedAvailability || selectedAvailability.available <= 0) {
    return {
      handled: true,
      reply:
        `The ${roomType} is not available for ${dateRange.checkIn} to ${dateRange.checkOut}. I will notify staff to help with alternatives.`,
      escalate: true,
      reason: "ai_flagged",
    };
  }

  const requestedRooms =
    Number((`${history.map((h) => h.content).join(" ")} ${message}`).match(/\b(\d+)\s*(?:rooms?|room)\b/i)?.[1] || 1) || 1;
  if (selectedAvailability.available < requestedRooms) {
    return {
      handled: true,
      reply:
        `Only ${selectedAvailability.available} ${roomType} room(s) are available for those dates. I will notify staff to assist with options.`,
      escalate: true,
      reason: "ai_flagged",
    };
  }

  const details = extractGuestDetails(message, history);
  const guestName = details.guestName || guestProfile?.name;
  const guestPhone = details.guestPhone || guestProfile?.phone || undefined;
  const guestEmail = details.guestEmail || guestProfile?.email;

  if (!guestName || !guestPhone) {
    return {
      handled: true,
      reply:
        `The ${roomType} is available for ${dateRange.checkIn} to ${dateRange.checkOut}. Please share your full name and phone number to confirm the booking.`,
      escalate: false,
    };
  }

  const booking = bookings.create({
    roomType,
    checkIn: dateRange.checkIn,
    checkOut: dateRange.checkOut,
    rooms: Math.max(1, Math.floor(requestedRooms)),
    guestName,
    guestPhone,
    guestEmail,
    guestId: guestProfile?.id,
    status: "confirmed",
  });

  return {
    handled: true,
    reply: serializeBookingReply({
      hotelName: config.branding.hotelName,
      roomType,
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      rooms: booking.rooms,
      guestName: booking.guest_name,
      bookingId: booking.id,
    }),
    booking: {
      id: booking.id,
      roomType: booking.room_type,
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      rooms: booking.rooms,
      guestName: booking.guest_name,
      guestPhone: booking.guest_phone,
      guestEmail: booking.guest_email,
      status: booking.status,
    },
    escalate: false,
  };
}

export async function POST(req: Request) {
  try {
    // Rate limit: 30 chat requests per minute per IP
    const ip = getClientIP(req);
    const guestSession = await getGuestSession();
    const guestRecord = guestSession ? guests.findById(guestSession.guestId) : undefined;

    const chatLimit = checkGuestChatRateLimit({
      ip,
      guestId: guestSession?.guestId,
    });
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

    const { message, language, history } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'A valid message string is required.' }, { status: 400 });
    }

    if (!isAiConfigured()) {
      return NextResponse.json(aiNotConfiguredResponse(), { status: 501 });
    }

    const config = getHotelConfig();
    const langCode = language || config.language || 'en-US';

    // Pass conversation history for multi-turn memory
    const conversationHistory = Array.isArray(history) ? history : [];

    const startTime = Date.now();
    let reply = "";
    let escalate = false;
    let reason: EscalationReason | undefined;
    let booking: BookingSummary | undefined;

    const bookingFlow = await buildBookingReply({
      message,
      langCode,
      config,
      history: conversationHistory,
      guestProfile: guestRecord
        ? {
            id: guestRecord.id,
            name: guestRecord.name,
            phone: guestRecord.phone,
            email: guestRecord.email,
          }
        : undefined,
    });

    if (bookingFlow.handled) {
      reply = bookingFlow.reply || "I can help with that booking.";
      escalate = Boolean(bookingFlow.escalate);
      reason = bookingFlow.reason;
      booking = bookingFlow.booking;
    } else {
      const aiResult = await getAssistantResponse(message, langCode, conversationHistory);
      reply = aiResult.reply;
      escalate = aiResult.escalate;
      reason = aiResult.reason;
    }
    const responseTimeMs = Date.now() - startTime;

    // Log interaction
    try {
      interactions.log({
        guestMessage: message,
        aiResponse: reply,
        language: langCode,
        guestId: guestSession?.guestId,
      });
      if (guestSession?.guestId) {
        guests.recordMessage(guestSession.guestId);
      }
    } catch (e) {
      console.error("Failed to log interaction:", e);
    }

    // Auto-create support ticket + email alert on escalation
    let ticketId: string | undefined;
    if (escalate) {
      ticketId = await notifyHotelStaff({
        guestMessage: message,
        aiResponse: reply,
        language: langCode,
        reason,
      });
    }

    return NextResponse.json({
      reply,
      escalated: escalate,
      ticketId,
      booking,
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
