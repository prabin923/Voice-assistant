import { NextResponse } from "next/server";
import { ensureHotelConfigLoaded } from "@/lib/hotelConfig";
import { ensureDbReady } from "@/lib/db";
import { getGuestSession } from "@/lib/guestAuth";
import { isPaymentEnabled, createDepositCheckoutSession, calculateDeposit } from "@/lib/stripePayment";
import type { PendingBooking } from "@/lib/bookingFlow";
import { runWithTenant, tenantSlugFromRequest } from "@/lib/tenantContext";
import { normalizeHotelSlug } from "@/lib/slug";
import { checkGuestChatRateLimit } from "@/lib/guestRateLimit";
import { getClientIP } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

function appBaseUrl(req: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      pendingBooking?: PendingBooking;
      hotel?: string;
    };

    const tenantSlug = normalizeHotelSlug(body.hotel) ?? tenantSlugFromRequest(req);

    return await runWithTenant({ slug: tenantSlug }, async () => {
      await ensureDbReady();
      const config = await ensureHotelConfigLoaded();

      if (!isPaymentEnabled(config)) {
        return NextResponse.json({ error: "Payment not enabled for this hotel." }, { status: 400 });
      }

      const pending = body.pendingBooking;
      if (!pending?.roomType || !pending.checkIn || !pending.checkOut || !pending.guestName || !pending.guestPhone) {
        return NextResponse.json({ error: "Incomplete booking details." }, { status: 400 });
      }

      const guestSession = await getGuestSession();

      const ip = getClientIP(req);
      const limit = await checkGuestChatRateLimit({ ip, guestId: guestSession?.guestId });
      if (!limit.allowed) {
        return NextResponse.json({ error: "Too many requests." }, { status: 429 });
      }

      // Find hotelId from tenant context
      const { resolveTenantConfig } = await import("@/lib/tenantContext");
      const tenant = await resolveTenantConfig({ slug: tenantSlug });
      const hotelId = tenant.hotelId ?? "default";

      const { amount, currency } = calculateDeposit(pending, config);
      const session = await createDepositCheckoutSession(
        pending,
        config,
        hotelId,
        appBaseUrl(req)
      );

      return NextResponse.json({
        checkoutUrl: session.url,
        sessionId: session.id,
        depositAmount: amount / 100,
        currency,
      });
    });
  } catch (err: unknown) {
    console.error("[Payment] Checkout error:", err);
    const msg = err instanceof Error ? err.message : "Failed to create payment session.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
