import type { ServiceRequest } from "@/lib/db";

export type ServiceRequestDto = {
  id: string;
  type: string;
  description: string;
  roomNumber: string | null;
  guestName: string;
  guestId: string | null;
  status: string;
  priority: string;
  staffNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export function presentServiceRequest(request: ServiceRequest): ServiceRequestDto {
  return {
    id: request.id,
    type: request.type,
    description: request.description,
    roomNumber: request.room_number,
    guestName: request.guest_name,
    guestId: request.guest_id,
    status: request.status,
    priority: request.priority,
    staffNotes: request.staff_notes,
    createdAt: request.created_at,
    resolvedAt: request.resolved_at,
  };
}

export function presentServiceRequests(requests: ServiceRequest[]): ServiceRequestDto[] {
  return requests.map(presentServiceRequest);
}
