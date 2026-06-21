import { NextResponse } from "next/server";
import { verifyCheckoutSession } from "@/lib/stripePayment";
import { createBookingSafe } from "@/lib/bookingService";
import { notifyBookingComplete } from "@/lib/bookingNotify";
import { ensureDbReady } from "@/lib/db";
import { runWithTenant } from "@/lib/tenantContext";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId?.startsWith("cs_")) {
    return NextResponse.json({ error: "Invalid session ID." }, { status: 400 });
  }

  try {
    const session = await verifyCheckoutSession(sessionId);

    if (!session.paid) {
      return NextResponse.json({ error: "Payment not completed." }, { status: 402 });
    }

    const m = session.metadata;
    if (!m.roomType || !m.checkIn || !m.checkOut || !m.guestName || !m.guestPhone) {
      return NextResponse.json({ error: "Booking metadata missing from payment session." }, { status: 422 });
    }

    await ensureDbReady();

    // Run in the correct hotel tenant context
    return await runWithTenant({ hotelId: m.hotelId }, async () => {
      const result = await createBookingSafe({
        roomType: m.roomType!,
        checkIn: m.checkIn!,
        checkOut: m.checkOut!,
        rooms: Number(m.rooms ?? 1),
        guestName: m.guestName!,
        guestPhone: m.guestPhone!,
        guestEmail: m.guestEmail,
        guestId: m.guestId,
        specialRequests: m.specialRequests,
      });

      if (!result.ok) {
        return NextResponse.json(
          { error: result.error ?? "Booking could not be created after payment." },
          { status: result.status }
        );
      }

      const booking = result.booking;
      notifyBookingComplete(booking, "confirmed", `Stripe payment ${sessionId}`);

      return NextResponse.json({
        ok: true,
        booking: {
          id: booking.id,
          roomType: booking.room_type,
          checkIn: booking.check_in,
          checkOut: booking.check_out,
          rooms: booking.rooms,
          guestName: booking.guest_name,
          guestEmail: booking.guest_email,
          status: "confirmed",
          depositPaid: true,
          depositAmount: session.amountTotal / 100,
          currency: session.currency.toUpperCase(),
        },
      });
    });
  } catch (err: unknown) {
    console.error("[Payment] Success handler error:", err);
    const msg = err instanceof Error ? err.message : "Payment verification failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
