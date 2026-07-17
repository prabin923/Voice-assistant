import { NextResponse } from "next/server";
import { serviceRequests } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { createServiceRequestSafe } from "@/lib/serviceRequestService";
import { presentServiceRequest, presentServiceRequests } from "@/lib/serviceRequestPresenter";

const ALLOWED_TYPES = new Set(["housekeeping", "maintenance", "roomservice"]);
const ALLOWED_PRIORITIES = new Set(["low", "medium", "high", "urgent"]);
const ALLOWED_STATUSES = new Set(["open", "in_progress", "completed"]);

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const [requests, counts] = await Promise.all([
    serviceRequests.listRecent(100),
    serviceRequests.countByStatus(),
  ]);
  return NextResponse.json({ requests: presentServiceRequests(requests), counts });
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await req.json() as {
    type?: string;
    description?: string;
    roomNumber?: string;
    guestName?: string;
    priority?: string;
  };

  const type = body.type?.trim().toLowerCase() || "";
  const priority = body.priority?.trim().toLowerCase() || "medium";
  const description = body.description?.trim() || "";
  const guestName = body.guestName?.trim() || "";

  if (!ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ error: "Unsupported service request type." }, { status: 400 });
  }
  if (!ALLOWED_PRIORITIES.has(priority)) {
    return NextResponse.json({ error: "Unsupported priority." }, { status: 400 });
  }

  const result = await createServiceRequestSafe({
    type,
    description,
    roomNumber: body.roomNumber?.trim(),
    guestName,
    priority,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ request: presentServiceRequest(result.request) }, { status: 201 });
}

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const body = await req.json() as { id: string; status: string; staffNotes?: string };
  if (!body.id || !body.status) {
    return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
  }
  if (!ALLOWED_STATUSES.has(body.status)) {
    return NextResponse.json({ error: "Unsupported status" }, { status: 400 });
  }
  const updated = await serviceRequests.updateStatus(body.id, body.status, body.staffNotes);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ request: presentServiceRequest(updated) });
}
