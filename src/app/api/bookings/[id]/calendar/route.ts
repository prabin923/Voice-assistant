import { NextResponse } from "next/server";
import { bookings } from "@/lib/db";
import { generateIcsFile } from "@/lib/bookingReminders";
import { ensureDbReady } from "@/lib/db";
import { runWithTenant, tenantSlugFromRequest } from "@/lib/tenantContext";
import { normalizeHotelSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const bookingId = params.id;
  const url = new URL(req.url);
  const tenantSlug = normalizeHotelSlug(url.searchParams.get("hotel")) ?? tenantSlugFromRequest(req);

  return await runWithTenant({ slug: tenantSlug }, async () => {
    await ensureDbReady();
    const booking = await bookings.getById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    const icsContent = generateIcsFile(booking);
    return new Response(icsContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="booking-${bookingId.slice(0, 8)}.ics"`,
      },
    });
  });
}
