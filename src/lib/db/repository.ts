import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { getRequiredTenantHotelId, tenantPrisma } from "@/lib/prisma-tenant";
import { normalizeHotelSlug } from "@/lib/slug";

import {
  mapAuthAuditLog,
  mapBooking,
  mapDiningReservation,
  mapFeedback,
  mapGuest,
  mapHotel,
  mapInteraction,
  mapReview,
  mapServiceRequest,
  mapSpaReservation,
  mapSupportTicket,
} from "@/lib/db/mappers";
import type {
  AuthAuditLog,
  Booking,
  DiningReservation,
  Guest,
  Hotel,
  Interaction,
  Review,
  ServiceRequest,
  SpaReservation,
  SupportTicket,
} from "@/lib/db/types";

const AUTH_RETENTION_DAYS = 90;

function id(): string {
  return randomUUID();
}

function parseIsoDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatIsoDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function listNights(checkIn: string, checkOut: string): string[] {
  const start = parseIsoDateOnly(checkIn);
  const end = parseIsoDateOnly(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) return [];
  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor < end) {
    dates.push(formatIsoDateOnly(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function cleanupOldAuthRecords() {
  const cutoff = new Date(Date.now() - AUTH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.authAuditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  await prisma.passwordResetToken.deleteMany({
    where: {
      OR: [{ usedAt: { not: null } }, { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }],
    },
  });
}

async function seedDefaultAdmin() {
  if (process.env.NODE_ENV === "production" || process.env.SEED_DEFAULT_ADMIN !== "true") return;
  const count = await prisma.hotel.count();
  if (count > 0) return;
  const bcrypt = await import("bcryptjs");
  const hash = bcrypt.hashSync("password123", 10);
  await prisma.hotel.create({
    data: { id: id(), name: "Dev Admin", email: "admin@hotel.com", password: hash },
  });
  console.warn("[db] SEED_DEFAULT_ADMIN=true — created dev admin admin@hotel.com (change password immediately)");
}

export async function initDb(): Promise<void> {
  await prisma.$connect();
  await seedDefaultAdmin();
  await cleanupOldAuthRecords();
}

export const interactions = {
  async log(data: {
    guestMessage: string;
    aiResponse: string;
    language: string;
    guestId?: string | null;
  }) {
    const hotelId = await getRequiredTenantHotelId();
    await tenantPrisma().interaction.create({
      data: {
        id: id(),
        hotelId,
        guestMessage: data.guestMessage,
        aiResponse: data.aiResponse,
        language: data.language,
        guestId: data.guestId ?? null,
      },
    });
  },

  async totalCount(): Promise<number> {
    return tenantPrisma().interaction.count();
  },

  async dailyCounts(days = 30): Promise<{ date: string; count: number }[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await tenantPrisma().interaction.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    });
    const counts = new Map<string, number>();
    for (const row of rows) {
      const date = row.createdAt.toISOString().slice(0, 10);
      counts.set(date, (counts.get(date) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  },

  async languageDistribution(): Promise<{ language: string; count: number }[]> {
    const rows = await tenantPrisma().interaction.groupBy({
      by: ["language"],
      _count: { _all: true },
      orderBy: { _count: { language: "desc" } },
    });
    return rows.map((row) => ({ language: row.language, count: row._count._all }));
  },

  async peakHours(): Promise<{ hour: number; count: number }[]> {
    const rows = await tenantPrisma().interaction.findMany({ select: { createdAt: true } });
    const counts = new Map<number, number>();
    for (const row of rows) {
      const hour = row.createdAt.getUTCHours();
      counts.set(hour, (counts.get(hour) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort(([a], [b]) => a - b)
      .map(([hour, count]) => ({ hour, count }));
  },

  async recent(limit = 20): Promise<Interaction[]> {
    const rows = await tenantPrisma().interaction.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(mapInteraction);
  },

  async todayCount(): Promise<number> {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return tenantPrisma().interaction.count({
      where: { createdAt: { gte: start, lt: end } },
    });
  },

  async avgPerDay(days = 30): Promise<number> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await tenantPrisma().interaction.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    });
    const daily = new Map<string, number>();
    for (const row of rows) {
      const date = row.createdAt.toISOString().slice(0, 10);
      daily.set(date, (daily.get(date) ?? 0) + 1);
    }
    if (daily.size === 0) return 0;
    const avg = [...daily.values()].reduce((sum, n) => sum + n, 0) / daily.size;
    return Math.round(avg * 10) / 10;
  },

  async topGuestMessages(limit = 8): Promise<{ message: string; count: number }[]> {
    const rows = await tenantPrisma().interaction.groupBy({
      by: ["guestMessage"],
      _count: { _all: true },
      orderBy: { _count: { guestMessage: "desc" } },
      take: Math.max(1, Math.min(20, limit)),
    });
    return rows.map((row) => ({ message: row.guestMessage, count: row._count._all }));
  },
};

export const supportTickets = {
  async create(data: {
    guestMessage: string;
    aiResponse: string;
    language: string;
    escalationReason?: string;
  }): Promise<SupportTicket> {
    const ticketId = id();
    const hotelId = await getRequiredTenantHotelId();
    await tenantPrisma().supportTicket.create({
      data: {
        id: ticketId,
        hotelId,
        guestMessage: data.guestMessage,
        aiResponse: data.aiResponse,
        language: data.language,
        escalationReason: data.escalationReason ?? null,
      },
    });
    const row = await tenantPrisma().supportTicket.findUniqueOrThrow({ where: { id: ticketId } });
    return mapSupportTicket(row);
  },

  async list(status?: string): Promise<SupportTicket[]> {
    const rows = await tenantPrisma().supportTicket.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapSupportTicket);
  },

  async getById(ticketId: string): Promise<SupportTicket | undefined> {
    const row = await tenantPrisma().supportTicket.findUnique({ where: { id: ticketId } });
    return row ? mapSupportTicket(row) : undefined;
  },

  async reply(ticketId: string, staffReply: string) {
    await tenantPrisma().supportTicket.update({
      where: { id: ticketId },
      data: { staffReply, status: "resolved", resolvedAt: new Date() },
    });
  },

  async openCount(): Promise<number> {
    return tenantPrisma().supportTicket.count({ where: { status: "open" } });
  },
};

export const availability = {
  async getNight(roomType: string, date: string) {
    const defaultInventory = await this.getDefault(roomType);
    const override = await this.getOverride(roomType, date);
    const capacity = override ?? defaultInventory;
    const agg = await tenantPrisma().booking.aggregate({
      where: {
        roomType,
        status: "confirmed",
        checkIn: { lte: date },
        checkOut: { gt: date },
      },
      _sum: { rooms: true },
    });
    const booked = agg._sum.rooms ?? 0;
    const free = Math.max(0, capacity - booked);
    return { roomType, date, defaultInventory, override, capacity, booked, free };
  },

  async hasDefault(roomType: string): Promise<boolean> {
    const row = await tenantPrisma().roomInventoryDefault.findFirst({ where: { roomType } });
    return Boolean(row);
  },

  async getDefault(roomType: string): Promise<number> {
    const row = await tenantPrisma().roomInventoryDefault.findFirst({ where: { roomType } });
    return row?.count ?? 1;
  },

  async setDefault(roomType: string, count: number) {
    const hotelId = await getRequiredTenantHotelId();
    await tenantPrisma().roomInventoryDefault.upsert({
      where: { hotelId_roomType: { hotelId, roomType } },
      create: { hotelId, roomType, count: Math.max(0, Math.floor(count)) },
      update: { count: Math.max(0, Math.floor(count)) },
    });
  },

  async getOverride(roomType: string, date: string): Promise<number | null> {
    const row = await tenantPrisma().roomInventoryOverride.findFirst({
      where: { roomType, date },
    });
    return row?.count ?? null;
  },

  async setOverride(roomType: string, date: string, count: number) {
    const hotelId = await getRequiredTenantHotelId();
    await tenantPrisma().roomInventoryOverride.upsert({
      where: { hotelId_roomType_date: { hotelId, roomType, date } },
      create: { hotelId, roomType, date, count: Math.max(0, Math.floor(count)) },
      update: { count: Math.max(0, Math.floor(count)) },
    });
  },

  async clearOverride(roomType: string, date: string) {
    await tenantPrisma().roomInventoryOverride.deleteMany({ where: { roomType, date } });
  },

  async get(roomType: string, checkIn: string, checkOut: string) {
    const nights = listNights(checkIn, checkOut);
    const defaultInventory = await this.getDefault(roomType);
    if (!nights.length) {
      return { roomType, checkIn, checkOut, available: 0, defaultInventory };
    }
    let minAvailable = Number.POSITIVE_INFINITY;
    for (const night of nights) {
      const nightly = await this.getNight(roomType, night);
      minAvailable = Math.min(minAvailable, nightly.free);
    }
    return {
      roomType,
      checkIn,
      checkOut,
      available: Number.isFinite(minAvailable) ? minAvailable : 0,
      defaultInventory,
    };
  },
};

type CreateBookingData = {
  roomType: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  guestId?: string | null;
  status?: "confirmed" | "cancelled";
  specialRequests?: string | null;
};

export const bookings = {
  async create(data: CreateBookingData): Promise<Booking> {
    return this.createTransactional(data);
  },

  async createTransactional(data: CreateBookingData): Promise<Booking> {
    const hotelId = await getRequiredTenantHotelId();
    return prisma.$transaction(async (tx) => {
      const normalizedRooms = Math.max(1, Math.floor(data.rooms));
      const status = data.status ?? "confirmed";

      if (status === "confirmed") {
        // Serialize concurrent bookings for this room type so the
        // availability check and the insert are atomic. Without this, two
        // bookings racing on the same room (AI + manual, or two AI) can both
        // read "available" and both insert -> oversell. Transaction-scoped
        // advisory lock; auto-released on commit/rollback.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(727, hashtext(${data.roomType}))`;
        const avail = await availability.get(data.roomType, data.checkIn, data.checkOut);
        if (avail.available < normalizedRooms) throw new Error("UNAVAILABLE");
      }

      const bookingId = id();
      await tx.booking.create({
        data: {
          id: bookingId,
          hotelId,
          roomType: data.roomType,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          rooms: normalizedRooms,
          guestName: data.guestName.trim(),
          guestPhone: data.guestPhone.trim(),
          guestEmail: data.guestEmail?.trim() || null,
          guestId: data.guestId ?? null,
          status,
          specialRequests: data.specialRequests?.trim() || null,
        },
      });

      if (data.guestId && status === "confirmed") {
        await tx.guest.update({
          where: { id: data.guestId },
          data: { bookingCount: { increment: 1 } },
        });
      }

      const row = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
      return mapBooking(row);
    });
  },

  async getById(bookingId: string): Promise<Booking | undefined> {
    const row = await tenantPrisma().booking.findUnique({ where: { id: bookingId } });
    return row ? mapBooking(row) : undefined;
  },

  async findByIdPrefix(prefix: string): Promise<Booking | undefined> {
    const normalized = prefix.trim().toLowerCase();
    if (normalized.length < 4) return undefined;
    const row = await tenantPrisma().booking.findFirst({
      where: { id: { startsWith: normalized }, status: "confirmed" },
      orderBy: { createdAt: "desc" },
    });
    return row ? mapBooking(row) : undefined;
  },

  async cancel(bookingId: string): Promise<Booking | null> {
    const existing = await this.getById(bookingId);
    if (!existing || existing.status === "cancelled") return null;

    await tenantPrisma().booking.update({
      where: { id: bookingId },
      data: { status: "cancelled" },
    });

    if (existing.guest_id) {
      const guest = await tenantPrisma().guest.findUnique({ where: { id: existing.guest_id } });
      if (guest && guest.bookingCount > 0) {
        await tenantPrisma().guest.update({
          where: { id: existing.guest_id },
          data: { bookingCount: { decrement: 1 } },
        });
      }
    }

    return (await this.getById(bookingId)) ?? null;
  },

  async appendSpecialRequest(bookingId: string, note: string): Promise<Booking | null> {
    const existing = await this.getById(bookingId);
    if (!existing || existing.status !== "confirmed") return null;
    const trimmed = note.trim().slice(0, 500);
    if (!trimmed) return existing;
    const merged = existing.special_requests
      ? `${existing.special_requests}; ${trimmed}`
      : trimmed;
    await tenantPrisma().booking.update({
      where: { id: bookingId },
      data: { specialRequests: merged.slice(0, 2000) },
    });
    return (await this.getById(bookingId)) ?? null;
  },

  async modify(
    bookingId: string,
    updates: { roomType?: string; checkIn?: string; checkOut?: string; rooms?: number }
  ): Promise<Booking> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({ where: { id: bookingId } });
      if (!existing || existing.status !== "confirmed") throw new Error("NOT_MODIFIABLE");

      const roomType = updates.roomType ?? existing.roomType;
      const checkIn = updates.checkIn ?? existing.checkIn;
      const checkOut = updates.checkOut ?? existing.checkOut;
      const rooms = Math.max(1, Math.floor(updates.rooms ?? existing.rooms));

      // Serialize against concurrent bookings for the target room type (see
      // createTransactional) so a modify can't oversell either.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(727, hashtext(${roomType}))`;
      await tx.booking.update({ where: { id: bookingId }, data: { status: "cancelled" } });
      const avail = await availability.get(roomType, checkIn, checkOut);
      if (avail.available < rooms) throw new Error("UNAVAILABLE");

      const row = await tx.booking.update({
        where: { id: bookingId },
        data: { roomType, checkIn, checkOut, rooms, status: "confirmed" },
      });
      return mapBooking(row);
    });
  },

  async listByGuestId(guestId: string, limit = 50): Promise<Booking[]> {
    const rows = await tenantPrisma().booking.findMany({
      where: { guestId },
      orderBy: { createdAt: "desc" },
      take: Math.max(1, Math.floor(limit)),
    });
    return rows.map(mapBooking);
  },

  async stats() {
    const [total, confirmed, cancelled, upcoming, createdLast30Days] = await Promise.all([
      tenantPrisma().booking.count(),
      tenantPrisma().booking.count({ where: { status: "confirmed" } }),
      tenantPrisma().booking.count({ where: { status: "cancelled" } }),
      tenantPrisma().booking.count({ where: { status: "confirmed", checkOut: { gt: todayIsoDate() } } }),
      tenantPrisma().booking.count({
        where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
    ]);
    return { total, confirmed, cancelled, upcoming, createdLast30Days };
  },

  async list(limit = 100): Promise<Booking[]> {
    const rows = await tenantPrisma().booking.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.max(1, Math.floor(limit)),
    });
    return rows.map(mapBooking);
  },

  async upcoming(limit = 100): Promise<Booking[]> {
    const rows = await tenantPrisma().booking.findMany({
      where: { status: "confirmed", checkOut: { gt: todayIsoDate() } },
      orderBy: { checkIn: "asc" },
      take: Math.max(1, Math.floor(limit)),
    });
    return rows.map(mapBooking);
  },
};

export const guests = {
  async findByEmail(email: string): Promise<Guest | undefined> {
    const row = await tenantPrisma().guest.findFirst({
      where: { email: email.trim().toLowerCase() },
    });
    return row ? mapGuest(row) : undefined;
  },

  async findById(guestId: string): Promise<Guest | undefined> {
    const row = await tenantPrisma().guest.findFirst({ where: { id: guestId } });
    return row ? mapGuest(row) : undefined;
  },

  async create(data: {
    name: string;
    email: string;
    password: string;
    phone?: string | null;
    preferredLanguage?: string;
  }): Promise<Guest> {
    const guestId = id();
    const hotelId = await getRequiredTenantHotelId();
    await tenantPrisma().guest.create({
      data: {
        id: guestId,
        hotelId,
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        phone: data.phone?.trim() || null,
        preferredLanguage: data.preferredLanguage || "en-US",
        visitCount: 1,
        lastVisitAt: new Date(),
      },
    });
    return (await this.findById(guestId))!;
  },

  async recordVisit(guestId: string) {
    await tenantPrisma().guest.update({
      where: { id: guestId },
      data: { visitCount: { increment: 1 }, lastVisitAt: new Date() },
    });
  },

  async recordMessage(guestId: string) {
    await tenantPrisma().guest.update({
      where: { id: guestId },
      data: { messageCount: { increment: 1 } },
    });
  },

  async todayMessageCount(guestId: string): Promise<number> {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return tenantPrisma().interaction.count({
      where: { guestId, createdAt: { gte: start, lt: end } },
    });
  },

  async listLoyal(limit = 50) {
    const rows = await tenantPrisma().guest.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        visitCount: true,
        messageCount: true,
        bookingCount: true,
        lastVisitAt: true,
      },
      orderBy: [{ visitCount: "desc" }, { messageCount: "desc" }],
      take: Math.max(1, Math.floor(limit)),
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      visit_count: row.visitCount,
      message_count: row.messageCount,
      booking_count: row.bookingCount,
      last_visit_at: row.lastVisitAt?.toISOString() ?? null,
    }));
  },
};

export const hotels = {
  async findByEmail(email: string): Promise<Hotel | undefined> {
    const row = await prisma.hotel.findUnique({ where: { email } });
    return row ? mapHotel(row) : undefined;
  },

  async findById(hotelId: string): Promise<Hotel | undefined> {
    const row = await prisma.hotel.findUnique({ where: { id: hotelId } });
    return row ? mapHotel(row) : undefined;
  },

  async findBySlug(slug: string): Promise<Hotel | undefined> {
    const row = await prisma.hotel.findUnique({ where: { slug } });
    return row ? mapHotel(row) : undefined;
  },

  async create(data: {
    name: string;
    email: string;
    password: string;
    slug?: string | null;
  }): Promise<Hotel> {
    const hotelId = id();
    await prisma.hotel.create({
      data: {
        id: hotelId,
        name: data.name,
        email: data.email,
        password: data.password,
        slug: data.slug ?? null,
      },
    });
    return (await this.findById(hotelId))!;
  },

  async updateSlug(hotelId: string, slug: string) {
    await prisma.hotel.update({ where: { id: hotelId }, data: { slug } });
  },

  async bumpSessionVersion(hotelId: string): Promise<number> {
    const row = await prisma.hotel.update({
      where: { id: hotelId },
      data: { sessionVersion: { increment: 1 } },
    });
    return row.sessionVersion;
  },

  async updatePassword(hotelId: string, password: string) {
    await prisma.hotel.update({ where: { id: hotelId }, data: { password } });
  },

  async updateConfig(hotelId: string, config: string) {
    await prisma.hotel.update({ where: { id: hotelId }, data: { config } });
  },

  /**
   * Resolve the hotel used when a request has no explicit tenant context.
   *
   * Database `findFirst()` without an order is not deterministic: local and
   * production can return different rows from the same seed data. An explicit
   * DEFAULT_HOTEL_SLUG wins; otherwise use the oldest fully configured hotel,
   * then the oldest hotel as a final fallback.
   */
  async getFirst(): Promise<Hotel | undefined> {
    const defaultSlug = normalizeHotelSlug(process.env.DEFAULT_HOTEL_SLUG);
    if (defaultSlug) {
      const selected = await prisma.hotel.findUnique({ where: { slug: defaultSlug } });
      if (selected) return mapHotel(selected);
      console.warn(`[tenant] DEFAULT_HOTEL_SLUG "${defaultSlug}" was not found; using the configured default.`);
    }

    const configured = await prisma.hotel.findFirst({
      where: { config: { not: "{}" } },
      orderBy: { createdAt: "asc" },
    });
    const row = configured ?? await prisma.hotel.findFirst({ orderBy: { createdAt: "asc" } });
    return row ? mapHotel(row) : undefined;
  },

  async list(): Promise<Hotel[]> {
    const rows = await prisma.hotel.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map(mapHotel);
  },
};

export const authAuditLogs = {
  async create(data: {
    hotelId?: string | null;
    email: string;
    event: string;
    ip?: string | null;
    userAgent?: string | null;
    metadata?: string | null;
  }) {
    await prisma.authAuditLog.create({
      data: {
        id: id(),
        hotelId: data.hotelId ?? null,
        email: data.email,
        event: data.event,
        ip: data.ip ?? null,
        userAgent: data.userAgent ?? null,
        metadata: data.metadata ?? null,
      },
    });
  },

  async recentByHotel(hotelId: string, limit = 50): Promise<AuthAuditLog[]> {
    const rows = await prisma.authAuditLog.findMany({
      where: { hotelId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(mapAuthAuditLog);
  },
};

export const passwordResetTokens = {
  async create(data: { hotelId: string; tokenHash: string; expiresAt: string }) {
    await prisma.passwordResetToken.create({
      data: {
        id: id(),
        hotelId: data.hotelId,
        tokenHash: data.tokenHash,
        expiresAt: new Date(data.expiresAt),
      },
    });
  },

  async findActiveByHash(tokenHash: string) {
    const row = await prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!row) return undefined;
    return {
      id: row.id,
      hotel_id: row.hotelId,
      expires_at: row.expiresAt.toISOString(),
    };
  },

  async markUsed(tokenId: string) {
    await prisma.passwordResetToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  },

  async invalidateActiveForHotel(hotelId: string) {
    await prisma.passwordResetToken.updateMany({
      where: { hotelId, usedAt: null },
      data: { usedAt: new Date() },
    });
  },
};

export const diningReservations = {
  async create(data: {
    id: string;
    venueName: string;
    reservationDate: string;
    reservationTime: string;
    partySize: number;
    guestName: string;
    guestPhone: string;
    guestEmail?: string | null;
    guestId?: string | null;
    specialRequests?: string | null;
  }): Promise<DiningReservation> {
    const hotelId = await getRequiredTenantHotelId();
    const row = await tenantPrisma().diningReservation.create({
      data: {
        id: data.id,
        hotelId,
        venueName: data.venueName,
        reservationDate: data.reservationDate,
        reservationTime: data.reservationTime,
        partySize: Math.max(1, Math.floor(data.partySize)),
        guestName: data.guestName.trim(),
        guestPhone: data.guestPhone.trim(),
        guestEmail: data.guestEmail?.trim() || null,
        guestId: data.guestId ?? null,
        status: "confirmed",
        specialRequests: data.specialRequests?.trim() || null,
      },
    });
    return mapDiningReservation(row);
  },

  async getById(reservationId: string): Promise<DiningReservation | undefined> {
    const row = await tenantPrisma().diningReservation.findUnique({ where: { id: reservationId } });
    return row ? mapDiningReservation(row) : undefined;
  },

  async listByGuestId(guestId: string, limit = 50): Promise<DiningReservation[]> {
    const rows = await tenantPrisma().diningReservation.findMany({
      where: { guestId },
      orderBy: { createdAt: "desc" },
      take: Math.max(1, Math.floor(limit)),
    });
    return rows.map(mapDiningReservation);
  },

  async listRecent(limit = 50): Promise<DiningReservation[]> {
    const rows = await tenantPrisma().diningReservation.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.max(1, Math.floor(limit)),
    });
    return rows.map(mapDiningReservation);
  },
};

export const feedback = {
  async create(data: {
    messageContent: string;
    rating: "up" | "down";
    comment?: string;
    guestId?: string | null;
  }) {
    const feedbackId = id();
    const hotelId = await getRequiredTenantHotelId();
    await tenantPrisma().feedback.create({
      data: {
        id: feedbackId,
        hotelId,
        messageContent: data.messageContent,
        rating: data.rating,
        comment: data.comment || null,
        guestId: data.guestId ?? null,
      },
    });
    return feedbackId;
  },

  async stats() {
    const total = await tenantPrisma().feedback.count();
    const up = await tenantPrisma().feedback.count({ where: { rating: "up" } });
    const down = total - up;
    return { total, up, down, satisfaction: total > 0 ? Math.round((up / total) * 100) : 100 };
  },

  async recent(limit = 20) {
    const rows = await tenantPrisma().feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(mapFeedback);
  },
};

export const serviceRequests = {
  async create(data: {
    type: string;
    description: string;
    roomNumber?: string;
    guestName: string;
    guestId?: string;
    priority?: string;
  }): Promise<ServiceRequest> {
    const hotelId = await getRequiredTenantHotelId();
    const row = await tenantPrisma().serviceRequest.create({
      data: {
        id: id(),
        hotelId,
        type: data.type,
        description: data.description,
        roomNumber: data.roomNumber ?? null,
        guestName: data.guestName,
        guestId: data.guestId ?? null,
        priority: data.priority ?? "medium",
      },
    });
    return mapServiceRequest(row);
  },

  async updateStatus(requestId: string, status: string, staffNotes?: string): Promise<ServiceRequest | null> {
    try {
      const row = await tenantPrisma().serviceRequest.update({
        where: { id: requestId },
        data: {
          status,
          staffNotes: staffNotes ?? undefined,
          resolvedAt: status === "completed" ? new Date() : undefined,
        },
      });
      return mapServiceRequest(row);
    } catch {
      return null;
    }
  },

  async listOpen(limit = 50): Promise<ServiceRequest[]> {
    const rows = await tenantPrisma().serviceRequest.findMany({
      where: { status: { in: ["open", "in_progress"] } },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      take: limit,
    });
    return rows.map(mapServiceRequest);
  },

  async listRecent(limit = 50): Promise<ServiceRequest[]> {
    const rows = await tenantPrisma().serviceRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(mapServiceRequest);
  },

  async totalCount(): Promise<number> {
    return tenantPrisma().serviceRequest.count();
  },

  async countByStatus(): Promise<{ open: number; in_progress: number; completed: number }> {
    const [open, inProgress, completed] = await Promise.all([
      tenantPrisma().serviceRequest.count({ where: { status: "open" } }),
      tenantPrisma().serviceRequest.count({ where: { status: "in_progress" } }),
      tenantPrisma().serviceRequest.count({ where: { status: "completed" } }),
    ]);
    return { open, in_progress: inProgress, completed };
  },
};

export const spaReservations = {
  async create(data: {
    serviceName: string;
    reservationDate: string;
    reservationTime: string;
    durationMinutes?: number;
    guestName: string;
    guestPhone: string;
    guestEmail?: string;
    guestId?: string;
    therapistPreference?: string;
    specialRequests?: string;
    price?: number;
    currency?: string;
  }): Promise<SpaReservation> {
    const hotelId = await getRequiredTenantHotelId();
    const row = await tenantPrisma().spaReservation.create({
      data: {
        id: id(),
        hotelId,
        serviceName: data.serviceName,
        reservationDate: data.reservationDate,
        reservationTime: data.reservationTime,
        durationMinutes: data.durationMinutes ?? 60,
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        guestEmail: data.guestEmail ?? null,
        guestId: data.guestId ?? null,
        therapistPreference: data.therapistPreference ?? null,
        specialRequests: data.specialRequests ?? null,
        price: data.price ?? 0,
        currency: data.currency ?? "USD",
      },
    });
    return mapSpaReservation(row);
  },

  async cancel(reservationId: string): Promise<SpaReservation | null> {
    try {
      const row = await tenantPrisma().spaReservation.update({
        where: { id: reservationId },
        data: { status: "cancelled" },
      });
      return mapSpaReservation(row);
    } catch {
      return null;
    }
  },

  async listByGuestId(guestId: string, limit = 10): Promise<SpaReservation[]> {
    const rows = await tenantPrisma().spaReservation.findMany({
      where: { guestId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(mapSpaReservation);
  },

  async listRecent(limit = 50): Promise<SpaReservation[]> {
    const rows = await tenantPrisma().spaReservation.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(mapSpaReservation);
  },
};

export const reviews = {
  async create(data: {
    guestId?: string;
    guestName: string;
    bookingId?: string;
    hotelId?: string;
    rating: number;
    title?: string;
    comment?: string;
  }): Promise<Review> {
    const row = await tenantPrisma().review.create({
      data: {
        id: id(),
        guestId: data.guestId ?? null,
        guestName: data.guestName,
        bookingId: data.bookingId ?? null,
        hotelId: data.hotelId ?? null,
        rating: Math.max(1, Math.min(5, data.rating)),
        title: data.title ?? null,
        comment: data.comment ?? null,
      },
    });
    return mapReview(row);
  },

  async moderate(reviewId: string, status: string, staffResponse?: string): Promise<Review | null> {
    try {
      const row = await tenantPrisma().review.update({
        where: { id: reviewId },
        data: { status, staffResponse: staffResponse ?? undefined },
      });
      return mapReview(row);
    } catch {
      return null;
    }
  },

  async listApproved(hotelId?: string, limit = 50): Promise<Review[]> {
    const rows = await tenantPrisma().review.findMany({
      where: { status: "approved", ...(hotelId ? { hotelId } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(mapReview);
  },

  async listAll(limit = 50): Promise<Review[]> {
    const rows = await tenantPrisma().review.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(mapReview);
  },

  async stats(hotelId?: string): Promise<{ total: number; avgRating: number; distribution: Record<number, number> }> {
    const where = { status: "approved", ...(hotelId ? { hotelId } : {}) };
    const rows = await tenantPrisma().review.findMany({ where, select: { rating: true } });
    const total = rows.length;
    const avgRating = total > 0 ? rows.reduce((sum, r) => sum + r.rating, 0) / total : 0;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    rows.forEach((r) => { distribution[r.rating] = (distribution[r.rating] ?? 0) + 1; });
    return { total, avgRating: Math.round(avgRating * 10) / 10, distribution };
  },

  async listByGuestId(guestId: string, limit = 10): Promise<Review[]> {
    const rows = await tenantPrisma().review.findMany({
      where: { guestId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(mapReview);
  },
};
