import { NextResponse } from "next/server";
import { supportTickets, ensureDbReady } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { validateCsrf } from "@/lib/csrf";

// SECURITY: Support tickets contain guest conversations — require auth

// GET - List all tickets (optionally filter by status)
export async function GET(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  await ensureDbReady();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;

  const tickets = await supportTickets.list(status);
  const openCount = await supportTickets.openCount();

  return NextResponse.json({ tickets, openCount });
}

// PUT - Staff reply to a ticket
export async function PUT(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const csrfError = await validateCsrf(req);
  if (csrfError) return csrfError;

  try {
    await ensureDbReady();

    const { ticketId, staffReply } = await req.json();

    if (!ticketId || !staffReply) {
      return NextResponse.json({ error: "ticketId and staffReply are required" }, { status: 400 });
    }

    if (typeof ticketId !== "string" || typeof staffReply !== "string") {
      return NextResponse.json({ error: "Invalid input types" }, { status: 400 });
    }

    const ticket = await supportTickets.getById(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    await supportTickets.reply(ticketId, staffReply);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}
