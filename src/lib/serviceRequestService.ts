import { serviceRequests, type ServiceRequest } from "@/lib/db";
import { getHotelConfig } from "@/lib/hotelConfig";
import { sendStaffServiceRequestEmail } from "@/lib/email";

export type CreateServiceRequestInput = {
  type: string;
  description: string;
  roomNumber?: string;
  guestName: string;
  guestId?: string;
  priority?: string;
};

export async function createServiceRequestSafe(input: CreateServiceRequestInput): Promise<
  | { ok: true; request: ServiceRequest }
  | { ok: false; error: string; status: number }
> {
  const type = input.type.trim();
  const description = input.description.trim();
  const guestName = input.guestName.trim();

  if (!type || !description || !guestName) {
    return { ok: false, error: "Type, description, and guest name are required.", status: 400 };
  }

  try {
    const request = await serviceRequests.create({
      type,
      description,
      roomNumber: input.roomNumber?.trim(),
      guestName,
      guestId: input.guestId,
      priority: input.priority || "medium",
    });

    notifyServiceRequestComplete(request);
    return { ok: true, request };
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2021" || code === "42P01") {
      return {
        ok: false,
        error: "Service requests are not enabled yet. Please run database migrations.",
        status: 503,
      };
    }
    return { ok: false, error: "Could not save the service request.", status: 500 };
  }
}

export function notifyServiceRequestComplete(request: ServiceRequest): void {
  const config = getHotelConfig();
  console.log(
    `[SERVICE] Request #${request.id.slice(0, 8)} — ${request.type} for ${request.guest_name} room ${request.room_number || "N/A"}`
  );
  void sendStaffServiceRequestEmail({
    staffEmail: config.contact.email,
    hotelName: config.branding.hotelName,
    request: {
      id: request.id,
      type: request.type,
      description: request.description,
      roomNumber: request.room_number || undefined,
      guestName: request.guest_name,
      priority: request.priority,
    },
  }).catch((err) => console.error("[EMAIL] Service request FYI failed:", err));
}
