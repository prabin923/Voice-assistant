import { NextResponse } from "next/server";
import { parseTwilioBody, twimlReply, isTwilioConfigured } from "@/lib/whatsapp";
import { handleGuestServiceFlow, shouldRunGuestServiceFlow } from "@/lib/guestServiceFlow";
import { getAssistantResponse } from "@/lib/responseEngine";
import { ensureHotelConfigLoaded, findHotelByPhoneNumber, runWithTenant } from "@/lib/hotelConfig";
import { ensureDbReady } from "@/lib/db";
import { scheduleChatSideEffects } from "@/lib/chatSideEffects";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
const MAX_HISTORY = 8;

export async function POST(req: Request) {
  if (!isTwilioConfigured()) {
    return new Response("WhatsApp not configured", { status: 503 });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const params = parseTwilioBody(rawBody);
  const from = params.From ?? ""; // e.g. "whatsapp:+9779800000000"
  const to = params.To ?? "";
  const message = (params.Body ?? "").trim();
  const profileName = params.ProfileName ?? "";

  if (!from || !message) return twimlReply("Sorry, I didn't catch that.");

  await ensureDbReady();
  const hotel = await findHotelByPhoneNumber(to);
  const hotelId = hotel ? hotel.id : undefined;

  return runWithTenant({ hotelId }, async () => {
    const config = await ensureHotelConfigLoaded();
    const langCode = config.language || "en-US";

    // Load conversation history from Prisma
    let history: { role: "user" | "assistant"; content: string }[] = [];
    const session = await prisma.whatsAppSession.findUnique({
      where: { id: from },
    });
    if (session) {
      try {
        history = JSON.parse(session.history);
      } catch {
        history = [];
      }
    }

    let reply = "";

    const runServiceFlow = shouldRunGuestServiceFlow(
      message,
      history,
      langCode,
      config.rooms.map((r) => r.name),
      null,
      null
    );

    if (runServiceFlow) {
      const serviceFlow = await handleGuestServiceFlow({
        message,
        langCode,
        config,
        history,
        guestProfile: profileName
          ? { id: from, name: profileName, phone: from.replace("whatsapp:", ""), email: "" }
          : undefined,
        pendingBooking: null,
        pendingDining: null,
      });

      if (serviceFlow.handled) {
        reply = serviceFlow.reply ?? "I can help with that.";

        if (serviceFlow.booking) {
          const b = serviceFlow.booking;
          reply += `\n\n✅ *Booking #${b.id.slice(0, 8).toUpperCase()} confirmed*\n${b.roomType} · ${b.checkIn} → ${b.checkOut}\nGuest: ${b.guestName}`;
        }
        if (serviceFlow.dining) {
          const d = serviceFlow.dining;
          reply += `\n\n🍽 *Table reserved at ${d.venueName}*\n${d.reservationDate} at ${d.reservationTime} · ${d.partySize} guests`;
        }
      }
    }

    if (!reply) {
      const aiResult = await getAssistantResponse(message, langCode, history, "text");
      reply = aiResult.reply;
    }

    // Update conversation history in Prisma
    const updated = [
      ...history,
      { role: "user" as const, content: message },
      { role: "assistant" as const, content: reply },
    ].slice(-MAX_HISTORY);

    await prisma.whatsAppSession.upsert({
      where: { id: from },
      update: { history: JSON.stringify(updated), hotelId },
      create: { id: from, hotelId, history: JSON.stringify(updated) },
    });

    // Fire analytics side effects
    scheduleChatSideEffects({
      guestMessage: message,
      aiResponse: reply,
      language: langCode,
      escalate: false,
    });

    // WhatsApp supports basic markdown: *bold*, _italic_
    return twimlReply(reply);
  });
}

// Twilio sends GET to verify the webhook URL — return 200
export async function GET() {
  return NextResponse.json({ ok: true });
}
