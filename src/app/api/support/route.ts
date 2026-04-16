import { NextResponse } from "next/server";
import { supportTickets } from "@/lib/db";

// GET - List all tickets (optionally filter by status)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;

  const tickets = supportTickets.list(status);
  const openCount = supportTickets.openCount();

  return NextResponse.json({ tickets, openCount });
}

// PUT - Staff reply to a ticket
export async function PUT(req: Request) {
  try {
    const { ticketId, staffReply } = await req.json();

    if (!ticketId || !staffReply) {
      return NextResponse.json({ error: "ticketId and staffReply are required" }, { status: 400 });
    }

    const ticket = supportTickets.getById(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    supportTickets.reply(ticketId, staffReply);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update ticket", details: error.message }, { status: 500 });
  }
}
