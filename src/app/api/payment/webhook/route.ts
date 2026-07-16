import { NextResponse } from "next/server";
import { createBookingSafe } from "@/lib/bookingService";
import { notifyBookingComplete } from "@/lib/bookingNotify";
import { ensureDbReady } from "@/lib/db";
import { runWithTenant } from "@/lib/tenantContext";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const payload = await req.json() as {
      type: string;
      data: {
        object: {
          id: string;
          payment_status: string;
          metadata?: Record<string, string>;
          amount_total: number;
          currency: string;
        };
      };
    };

    if (payload.type === "checkout.session.completed") {
      const session = payload.data.object;
      if (session.payment_status === "paid" && session.metadata) {
        const m = session.metadata;
        if (m.roomType && m.checkIn && m.checkOut && m.guestName && m.guestPhone) {
          await ensureDbReady();
          await runWithTenant({ hotelId: m.hotelId }, async () => {
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

            if (result.ok) {
              notifyBookingComplete(result.booking, "confirmed", `Stripe Webhook ${session.id}`);
            }
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    console.error("[Stripe Webhook] Error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
