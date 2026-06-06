import { randomUUID } from "crypto";
import { getPrisma } from "@/lib/db/client";
import {
  mapAuthAuditLog,
  mapBooking,
  mapFeedback,
  mapGuest,
  mapHotel,
  mapInteraction,
  mapSupportTicket,
} from "@/lib/db/mappers";
import type {
  AuthAuditLog,
  Booking,
  Guest,
  Hotel,
  Interaction,
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
  const prisma = getPrisma();
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
  const prisma = getPrisma();
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
  const prisma = getPrisma();
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
    await getPrisma().interaction.create({
      data: {
        id: id(),
        guestMessage: data.guestMessage,
        aiResponse: data.aiResponse,
        language: data.language,
        guestId: data.guestId ?? null,
      },
    });
  },

  async totalCount(): Promise<number> {
    return getPrisma().interaction.count();
  },

  async dailyCounts(days = 30): Promise<{ date: string; count: number }[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await getPrisma().interaction.findMany({
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
    const rows = await getPrisma().interaction.groupBy({
      by: ["language"],
      _count: { _all: true },
      orderBy: { _count: { language: "desc" } },
    });
    return rows.map((row) => ({ language: row.language, count: row._count._all }));
  },

  async peakHours(): Promise<{ hour: number; count: number }[]> {
    const rows = await getPrisma().interaction.findMany({ select: { createdAt: true } });
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
    const rows = await getPrisma().interaction.findMany({
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
    return getPrisma().interaction.count({
      where: { createdAt: { gte: start, lt: end } },
    });
  },

  async avgPerDay(days = 30): Promise<number> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await getPrisma().interaction.findMany({
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
    const rows = await getPrisma().interaction.groupBy({
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
    await getPrisma().supportTicket.create({
      data: {
        id: ticketId,
        guestMessage: data.guestMessage,
        aiResponse: data.aiResponse,
        language: data.language,
        escalationReason: data.escalationReason ?? null,
      },
    });
    const row = await getPrisma().supportTicket.findUniqueOrThrow({ where: { id: ticketId } });
    return mapSupportTicket(row);
  },

  async list(status?: string): Promise<SupportTicket[]> {
    const rows = await getPrisma().supportTicket.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapSupportTicket);
  },

  async getById(ticketId: string): Promise<SupportTicket | undefined> {
    const row = await getPrisma().supportTicket.findUnique({ where: { id: ticketId } });
    return row ? mapSupportTicket(row) : undefined;
  },

  async reply(ticketId: string, staffReply: string) {
    await getPrisma().supportTicket.update({
      where: { id: ticketId },
      data: { staffReply, status: "resolved", resolvedAt: new Date() },
    });
  },

  async openCount(): Promise<number> {
    return getPrisma().supportTicket.count({ where: { status: "open" } });
  },
};

export const availability = {
  async getNight(roomType: string, date: string) {
    const defaultInventory = await this.getDefault(roomType);
    const override = await this.getOverride(roomType, date);
    const capacity = override ?? defaultInventory;
    const agg = await getPrisma().booking.aggregate({
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
    const row = await getPrisma().roomInventoryDefault.findUnique({ where: { roomType } });
    return Boolean(row);
  },

  async getDefault(roomType: string): Promise<number> {
    const row = await getPrisma().roomInventoryDefault.findUnique({ where: { roomType } });
    return row?.count ?? 1;
  },

  async setDefault(roomType: string, count: number) {
    await getPrisma().roomInventoryDefault.upsert({
      where: { roomType },
      create: { roomType, count: Math.max(0, Math.floor(count)) },
      update: { count: Math.max(0, Math.floor(count)) },
    });
  },

  async getOverride(roomType: string, date: string): Promise<number | null> {
    const row = await getPrisma().roomInventoryOverride.findUnique({
      where: { roomType_date: { roomType, date } },
    });
    return row?.count ?? null;
  },

  async setOverride(roomType: string, date: string, count: number) {
    await getPrisma().roomInventoryOverride.upsert({
      where: { roomType_date: { roomType, date } },
      create: { roomType, date, count: Math.max(0, Math.floor(count)) },
      update: { count: Math.max(0, Math.floor(count)) },
    });
  },

  async clearOverride(roomType: string, date: string) {
    await getPrisma().roomInventoryOverride.deleteMany({ where: { roomType, date } });
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
};

export const bookings = {
  async create(data: CreateBookingData): Promise<Booking> {
    return this.createTransactional(data);
  },

  async createTransactional(data: CreateBookingData): Promise<Booking> {
    const prisma = getPrisma();
    return prisma.$transaction(async (tx) => {
      const normalizedRooms = Math.max(1, Math.floor(data.rooms));
      const status = data.status ?? "confirmed";

      if (status === "confirmed") {
        const avail = await availability.get(data.roomType, data.checkIn, data.checkOut);
        if (avail.available < normalizedRooms) throw new Error("UNAVAILABLE");
      }

      const bookingId = id();
      await tx.booking.create({
        data: {
          id: bookingId,
          roomType: data.roomType,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          rooms: normalizedRooms,
          guestName: data.guestName.trim(),
          guestPhone: data.guestPhone.trim(),
          guestEmail: data.guestEmail?.trim() || null,
          guestId: data.guestId ?? null,
          status,
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
    const row = await getPrisma().booking.findUnique({ where: { id: bookingId } });
    return row ? mapBooking(row) : undefined;
  },

  async cancel(bookingId: string): Promise<Booking | null> {
    const existing = await this.getById(bookingId);
    if (!existing || existing.status === "cancelled") return null;

    await getPrisma().booking.update({
      where: { id: bookingId },
      data: { status: "cancelled" },
    });

    if (existing.guest_id) {
      const guest = await getPrisma().guest.findUnique({ where: { id: existing.guest_id } });
      if (guest && guest.bookingCount > 0) {
        await getPrisma().guest.update({
          where: { id: existing.guest_id },
          data: { bookingCount: { decrement: 1 } },
        });
      }
    }

    return (await this.getById(bookingId)) ?? null;
  },

  async modify(
    bookingId: string,
    updates: { roomType?: string; checkIn?: string; checkOut?: string; rooms?: number }
  ): Promise<Booking> {
    const prisma = getPrisma();
    return prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({ where: { id: bookingId } });
      if (!existing || existing.status !== "confirmed") throw new Error("NOT_MODIFIABLE");

      const roomType = updates.roomType ?? existing.roomType;
      const checkIn = updates.checkIn ?? existing.checkIn;
      const checkOut = updates.checkOut ?? existing.checkOut;
      const rooms = Math.max(1, Math.floor(updates.rooms ?? existing.rooms));

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
    const rows = await getPrisma().booking.findMany({
      where: { guestId },
      orderBy: { createdAt: "desc" },
      take: Math.max(1, Math.floor(limit)),
    });
    return rows.map(mapBooking);
  },

  async stats() {
    const prisma = getPrisma();
    const [total, confirmed, cancelled, upcoming, createdLast30Days] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { status: "confirmed" } }),
      prisma.booking.count({ where: { status: "cancelled" } }),
      prisma.booking.count({ where: { status: "confirmed", checkOut: { gt: todayIsoDate() } } }),
      prisma.booking.count({
        where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
    ]);
    return { total, confirmed, cancelled, upcoming, createdLast30Days };
  },

  async list(limit = 100): Promise<Booking[]> {
    const rows = await getPrisma().booking.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.max(1, Math.floor(limit)),
    });
    return rows.map(mapBooking);
  },

  async upcoming(limit = 100): Promise<Booking[]> {
    const rows = await getPrisma().booking.findMany({
      where: { status: "confirmed", checkOut: { gt: todayIsoDate() } },
      orderBy: { checkIn: "asc" },
      take: Math.max(1, Math.floor(limit)),
    });
    return rows.map(mapBooking);
  },
};

export const guests = {
  async findByEmail(email: string): Promise<Guest | undefined> {
    const row = await getPrisma().guest.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    return row ? mapGuest(row) : undefined;
  },

  async findById(guestId: string): Promise<Guest | undefined> {
    const row = await getPrisma().guest.findUnique({ where: { id: guestId } });
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
    await getPrisma().guest.create({
      data: {
        id: guestId,
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
    await getPrisma().guest.update({
      where: { id: guestId },
      data: { visitCount: { increment: 1 }, lastVisitAt: new Date() },
    });
  },

  async recordMessage(guestId: string) {
    await getPrisma().guest.update({
      where: { id: guestId },
      data: { messageCount: { increment: 1 } },
    });
  },

  async todayMessageCount(guestId: string): Promise<number> {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return getPrisma().interaction.count({
      where: { guestId, createdAt: { gte: start, lt: end } },
    });
  },

  async listLoyal(limit = 50) {
    const rows = await getPrisma().guest.findMany({
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
    const row = await getPrisma().hotel.findUnique({ where: { email } });
    return row ? mapHotel(row) : undefined;
  },

  async findById(hotelId: string): Promise<Hotel | undefined> {
    const row = await getPrisma().hotel.findUnique({ where: { id: hotelId } });
    return row ? mapHotel(row) : undefined;
  },

  async create(data: { name: string; email: string; password: string }): Promise<Hotel> {
    const hotelId = id();
    await getPrisma().hotel.create({
      data: { id: hotelId, name: data.name, email: data.email, password: data.password },
    });
    return (await this.findById(hotelId))!;
  },

  async bumpSessionVersion(hotelId: string): Promise<number> {
    const row = await getPrisma().hotel.update({
      where: { id: hotelId },
      data: { sessionVersion: { increment: 1 } },
    });
    return row.sessionVersion;
  },

  async updatePassword(hotelId: string, password: string) {
    await getPrisma().hotel.update({ where: { id: hotelId }, data: { password } });
  },

  async updateConfig(hotelId: string, config: string) {
    await getPrisma().hotel.update({ where: { id: hotelId }, data: { config } });
  },

  async getFirst(): Promise<Hotel | undefined> {
    const row = await getPrisma().hotel.findFirst();
    return row ? mapHotel(row) : undefined;
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
    await getPrisma().authAuditLog.create({
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
    const rows = await getPrisma().authAuditLog.findMany({
      where: { hotelId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(mapAuthAuditLog);
  },
};

export const passwordResetTokens = {
  async create(data: { hotelId: string; tokenHash: string; expiresAt: string }) {
    await getPrisma().passwordResetToken.create({
      data: {
        id: id(),
        hotelId: data.hotelId,
        tokenHash: data.tokenHash,
        expiresAt: new Date(data.expiresAt),
      },
    });
  },

  async findActiveByHash(tokenHash: string) {
    const row = await getPrisma().passwordResetToken.findFirst({
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
    await getPrisma().passwordResetToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  },

  async invalidateActiveForHotel(hotelId: string) {
    await getPrisma().passwordResetToken.updateMany({
      where: { hotelId, usedAt: null },
      data: { usedAt: new Date() },
    });
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
    await getPrisma().feedback.create({
      data: {
        id: feedbackId,
        messageContent: data.messageContent,
        rating: data.rating,
        comment: data.comment || null,
        guestId: data.guestId ?? null,
      },
    });
    return feedbackId;
  },

  async stats() {
    const prisma = getPrisma();
    const total = await prisma.feedback.count();
    const up = await prisma.feedback.count({ where: { rating: "up" } });
    const down = total - up;
    return { total, up, down, satisfaction: total > 0 ? Math.round((up / total) * 100) : 100 };
  },

  async recent(limit = 20) {
    const rows = await getPrisma().feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(mapFeedback);
  },
};
