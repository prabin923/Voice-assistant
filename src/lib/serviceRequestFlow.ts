import type { EscalationReason } from "@/lib/escalation";
import type { HotelConfig } from "@/lib/hotelConfig";
import type { ChatHistoryMessage } from "@/lib/dateParsing";
import { serviceRequests } from "@/lib/db";
import { extractGuestDetails } from "@/lib/bookingFlow";

export type PendingServiceRequest = {
  type: string;
  description: string;
  roomNumber?: string;
  guestName?: string;
};

export type ServiceRequestFlowResult = {
  handled: boolean;
  reply?: string;
  escalate?: boolean;
  reason?: EscalationReason;
  serviceRequest?: { id: string; type: string; description: string; status: string };
  pendingServiceRequest?: PendingServiceRequest | null;
};

type GuestProfile = { id: string; name: string; phone: string | null; email: string };

const SERVICE_KEYWORDS = [
  "towel", "towels", "pillow", "pillows", "blanket", "blankets",
  "housekeeping", "clean", "cleaning", "room service",
  "maintenance", "repair", "fix", "broken", "not working", "doesn't work",
  "ac", "air conditioning", "heating", "heater", "hot water",
  "light", "lights", "bulb", "leak", "leaking", "plumbing",
  "toilet", "shower", "sink", "drain", "clogged",
  "extra bed", "crib", "iron", "ironing",
  "minibar", "ice", "ice bucket",
  "wake up call", "wake-up call", "alarm",
  "laundry", "dry cleaning",
];

const URGENT_KEYWORDS = [
  "not working", "broken", "leak", "leaking", "emergency", "urgent",
  "no hot water", "no water", "no power", "no electricity",
  "locked out", "lock", "fire", "smoke", "flood",
  "ac not working", "heating not working",
];

function classifyType(description: string): string {
  const lower = description.toLowerCase();
  if (/\b(repair|fix|broken|not working|leak|plumb|electric|ac|heating|light|bulb|drain|clog)\b/.test(lower)) {
    return "maintenance";
  }
  if (/\b(room service|food|meal|breakfast|lunch|dinner|menu)\b/.test(lower)) {
    return "roomservice";
  }
  return "housekeeping";
}

function classifyPriority(description: string): string {
  const lower = description.toLowerCase();
  if (URGENT_KEYWORDS.some((kw) => lower.includes(kw))) return "high";
  if (/\b(emergency|urgent|immediately|asap)\b/.test(lower)) return "urgent";
  return "medium";
}

export function isServiceRequestIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return SERVICE_KEYWORDS.some((kw) => lower.includes(kw)) &&
    !(/\b(book|reserve|reservation|check.?in|check.?out|cancel|modify|available)\b/i.test(message));
}

function extractRoomNumber(message: string, history: ChatHistoryMessage[]): string | undefined {
  const source = [...history.filter((h) => h.role === "user").map((h) => h.content), message].join(" ");
  const match = source.match(/\b(?:room|rm)\s*#?\s*(\d{1,4}[a-zA-Z]?)\b/i);
  return match?.[1];
}

function extractDescription(message: string): string {
  // Clean up common request prefixes
  return message
    .replace(/^(?:i need|can i get|could i have|please|i'd like|i would like|can you|could you)\s+/i, "")
    .trim()
    .slice(0, 500);
}

export async function handleServiceRequestFlow(params: {
  message: string;
  langCode: string;
  config: HotelConfig;
  history: ChatHistoryMessage[];
  guestProfile?: GuestProfile;
  pendingServiceRequest?: PendingServiceRequest | null;
}): Promise<ServiceRequestFlowResult> {
  const { message, config, history, guestProfile, pendingServiceRequest } = params;

  // Continue pending request — need guest name
  if (pendingServiceRequest) {
    const details = extractGuestDetails(message, history);
    const guestName = details.guestName || guestProfile?.name;

    if (!guestName) {
      return {
        handled: true,
        reply: "Could you share your name and room number so our team knows where to go?",
        pendingServiceRequest,
      };
    }

    const updated = { ...pendingServiceRequest, guestName };
    const roomNumber = extractRoomNumber(message, history) || updated.roomNumber;

    // Create the request
    const req = await serviceRequests.create({
      type: updated.type,
      description: updated.description,
      roomNumber,
      guestName: updated.guestName,
      guestId: guestProfile?.id,
      priority: classifyPriority(updated.description),
    });

    const typeLabel = updated.type === "maintenance" ? "maintenance" : updated.type === "roomservice" ? "room service" : "housekeeping";
    const eta = updated.type === "maintenance" ? "as soon as possible" : "within 15-30 minutes";

    return {
      handled: true,
      reply: `Your ${typeLabel} request has been submitted! Our team will attend to "${updated.description}" ${eta}. Request ID: #${req.id.slice(0, 8).toUpperCase()}.`,
      serviceRequest: { id: req.id, type: req.type, description: req.description, status: req.status },
      pendingServiceRequest: null,
    };
  }

  // New service request
  const description = extractDescription(message);
  const type = classifyType(description);
  const roomNumber = extractRoomNumber(message, history);
  const guestName = extractGuestDetails(message, history).guestName || guestProfile?.name;

  if (!guestName) {
    return {
      handled: true,
      reply: `I'd be happy to arrange that for you. Could you share your name and room number?`,
      pendingServiceRequest: { type, description, roomNumber },
    };
  }

  // Have everything — create immediately
  const req = await serviceRequests.create({
    type,
    description,
    roomNumber,
    guestName,
    guestId: guestProfile?.id,
    priority: classifyPriority(description),
  });

  const typeLabel = type === "maintenance" ? "maintenance" : type === "roomservice" ? "room service" : "housekeeping";
  const eta = type === "maintenance" ? "as soon as possible" : "within 15-30 minutes";
  const ops = config.operations;
  const hours = type === "maintenance" ? "" : ops?.housekeepingHours ? ` (hours: ${ops.housekeepingHours})` : "";

  return {
    handled: true,
    reply: `Done! Your ${typeLabel} request has been submitted — "${description}". Our team will attend to it ${eta}${hours}. Request ID: #${req.id.slice(0, 8).toUpperCase()}.`,
    serviceRequest: { id: req.id, type: req.type, description: req.description, status: req.status },
    pendingServiceRequest: null,
  };
}
