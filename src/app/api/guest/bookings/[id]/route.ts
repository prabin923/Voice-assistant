import { NextResponse } from "next/server";
import { requireGuestAuth } from "@/lib/guestAuth";
import { validateSameOrigin } from "@/lib/csrf";
import { cancelBookingSafe, modifyBookingSafe, publicBookingRow } from "@/lib/bookingService";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  const auth = await requireGuestAuth();
  if (auth.error) return auth.error;

  const csrfError = await validateSameOrigin(req);
  if (csrfError) return csrfError;

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const action = typeof body?.action === "string" ? body.action : "";

  if (action === "cancel") {
    const result = await cancelBookingSafe(id, { guestId: auth.session.guestId });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, booking: publicBookingRow(result.booking) });
  }

  if (action === "modify") {
    const updates = {
      roomType: typeof body?.roomType === "string" ? body.roomType : undefined,
      checkIn: typeof body?.checkIn === "string" ? body.checkIn : undefined,
      checkOut: typeof body?.checkOut === "string" ? body.checkOut : undefined,
      rooms: body?.rooms == null ? undefined : Number(body.rooms),
    };
    const result = await modifyBookingSafe(id, updates, { guestId: auth.session.guestId });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, ...(result.available !== undefined ? { available: result.available } : {}) },
        { status: result.status }
      );
    }
    return NextResponse.json({ success: true, booking: publicBookingRow(result.booking) });
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}
