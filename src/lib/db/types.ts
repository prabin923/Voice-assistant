export interface Hotel {
  id: string;
  name: string;
  email: string;
  password: string;
  session_version: number;
  config: string;
  created_at: string;
  updated_at: string;
}

export interface AuthAuditLog {
  id: string;
  hotel_id: string | null;
  email: string;
  event: string;
  ip: string | null;
  user_agent: string | null;
  metadata: string | null;
  created_at: string;
}

export interface Interaction {
  id: string;
  guest_message: string;
  ai_response: string;
  language: string;
  guest_id: string | null;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  guest_message: string;
  ai_response: string;
  language: string;
  status: string;
  staff_reply: string | null;
  escalation_reason: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface Booking {
  id: string;
  room_type: string;
  check_in: string;
  check_out: string;
  rooms: number;
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  guest_id: string | null;
  status: string;
  special_requests: string | null;
  created_at: string;
}

export interface DiningReservation {
  id: string;
  venue_name: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  guest_id: string | null;
  status: string;
  special_requests: string | null;
  created_at: string;
}

export interface RoomAvailability {
  roomType: string;
  checkIn: string;
  checkOut: string;
  available: number;
  defaultInventory: number;
}

export interface Guest {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string | null;
  preferred_language: string;
  session_version: number;
  visit_count: number;
  message_count: number;
  booking_count: number;
  last_visit_at: string | null;
  created_at: string;
  updated_at: string;
}

export type BookingModifyInput = {
  roomType?: string;
  checkIn?: string;
  checkOut?: string;
  rooms?: number;
};
