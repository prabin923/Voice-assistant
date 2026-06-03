import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import { ensureDatabaseDirectory, resolveDatabasePath } from "@/lib/dbPath";

const dbPath = resolveDatabasePath();

const globalForDb = globalThis as unknown as { db: Database.Database; authCleanupStarted?: boolean };
const AUTH_RETENTION_DAYS = 90;

function getDb(): Database.Database {
  if (globalForDb.db) return globalForDb.db;

  ensureDatabaseDirectory(dbPath);
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS hotels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      session_version INTEGER NOT NULL DEFAULT 0,
      config TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Lightweight migrations for existing databases.
  const hotelColumns = db.prepare("PRAGMA table_info(hotels)").all() as Array<{ name: string }>;
  if (!hotelColumns.some((col) => col.name === "session_version")) {
    db.exec("ALTER TABLE hotels ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS interactions (
      id TEXT PRIMARY KEY,
      guest_message TEXT NOT NULL,
      ai_response TEXT NOT NULL,
      language TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      guest_message TEXT NOT NULL,
      ai_response TEXT NOT NULL,
      language TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      staff_reply TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      message_content TEXT NOT NULL,
      rating TEXT NOT NULL CHECK(rating IN ('up', 'down')),
      comment TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_audit_logs (
      id TEXT PRIMARY KEY,
      hotel_id TEXT,
      email TEXT NOT NULL,
      event TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  globalForDb.db = db;
  
  // Seed default admin user if none exist
  const countResult = db.prepare("SELECT COUNT(*) as count FROM hotels").get() as { count: number };
  if (countResult.count === 0) {
    const bcrypt = require("bcryptjs");
    const hash = bcrypt.hashSync("password123", 10);
    const id = randomUUID();
    db.prepare(
      "INSERT INTO hotels (id, name, email, password) VALUES (?, ?, ?, ?)"
    ).run(id, "Gokarna Admin", "admin@hotel.com", hash);
    console.log("Seeded default admin user: admin@hotel.com / password123");
  }

  return db;
}

export const db = getDb();

function generateId(): string {
  return randomUUID();
}

function cleanupOldAuthRecords() {
  db.prepare(
    `DELETE FROM auth_audit_logs
     WHERE created_at < datetime('now', ?)`
  ).run(`-${AUTH_RETENTION_DAYS} days`);

  db.prepare(
    `DELETE FROM password_reset_tokens
     WHERE used_at IS NOT NULL
        OR expires_at < datetime('now', '-1 day')`
  ).run();
}

if (!globalForDb.authCleanupStarted) {
  cleanupOldAuthRecords();
  if (!process.env.VERCEL) {
    setInterval(cleanupOldAuthRecords, 24 * 60 * 60 * 1000);
  }
  globalForDb.authCleanupStarted = true;
}

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
  created_at: string;
}

export const interactions = {
  log(data: { guestMessage: string; aiResponse: string; language: string }) {
    const id = generateId();
    db.prepare(
      "INSERT INTO interactions (id, guest_message, ai_response, language) VALUES (?, ?, ?, ?)"
    ).run(id, data.guestMessage, data.aiResponse, data.language);
  },

  totalCount(): number {
    return (db.prepare("SELECT COUNT(*) as count FROM interactions").get() as { count: number }).count;
  },

  dailyCounts(days: number = 30): { date: string; count: number }[] {
    return db.prepare(`
      SELECT date(created_at) as date, COUNT(*) as count
      FROM interactions
      WHERE created_at >= datetime('now', ?)
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).all(`-${days} days`) as { date: string; count: number }[];
  },

  languageDistribution(): { language: string; count: number }[] {
    return db.prepare(`
      SELECT language, COUNT(*) as count
      FROM interactions
      GROUP BY language
      ORDER BY count DESC
    `).all() as { language: string; count: number }[];
  },

  peakHours(): { hour: number; count: number }[] {
    return db.prepare(`
      SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as count
      FROM interactions
      GROUP BY hour
      ORDER BY hour ASC
    `).all() as { hour: number; count: number }[];
  },

  recent(limit: number = 20): Interaction[] {
    return db.prepare(
      "SELECT * FROM interactions ORDER BY created_at DESC LIMIT ?"
    ).all(limit) as Interaction[];
  },

  todayCount(): number {
    return (db.prepare(
      "SELECT COUNT(*) as count FROM interactions WHERE date(created_at) = date('now')"
    ).get() as { count: number }).count;
  },

  avgPerDay(days: number = 30): number {
    const result = db.prepare(`
      SELECT COALESCE(AVG(daily_count), 0) as avg
      FROM (
        SELECT COUNT(*) as daily_count
        FROM interactions
        WHERE created_at >= datetime('now', ?)
        GROUP BY date(created_at)
      )
    `).get(`-${days} days`) as { avg: number };
    return Math.round(result.avg * 10) / 10;
  },
};

export interface SupportTicket {
  id: string;
  guest_message: string;
  ai_response: string;
  language: string;
  status: string;
  staff_reply: string | null;
  created_at: string;
  resolved_at: string | null;
}

export const supportTickets = {
  create(data: { guestMessage: string; aiResponse: string; language: string }): SupportTicket {
    const id = generateId();
    db.prepare(
      "INSERT INTO support_tickets (id, guest_message, ai_response, language) VALUES (?, ?, ?, ?)"
    ).run(id, data.guestMessage, data.aiResponse, data.language);
    return db.prepare("SELECT * FROM support_tickets WHERE id = ?").get(id) as SupportTicket;
  },

  list(status?: string): SupportTicket[] {
    if (status) {
      return db.prepare("SELECT * FROM support_tickets WHERE status = ? ORDER BY created_at DESC").all(status) as SupportTicket[];
    }
    return db.prepare("SELECT * FROM support_tickets ORDER BY created_at DESC").all() as SupportTicket[];
  },

  getById(id: string): SupportTicket | undefined {
    return db.prepare("SELECT * FROM support_tickets WHERE id = ?").get(id) as SupportTicket | undefined;
  },

  reply(id: string, staffReply: string) {
    db.prepare(
      "UPDATE support_tickets SET staff_reply = ?, status = 'resolved', resolved_at = datetime('now') WHERE id = ?"
    ).run(staffReply, id);
  },

  openCount(): number {
    return (db.prepare("SELECT COUNT(*) as count FROM support_tickets WHERE status = 'open'").get() as { count: number }).count;
  },
};

export const hotels = {
  findByEmail(email: string): Hotel | undefined {
    return db.prepare("SELECT * FROM hotels WHERE email = ?").get(email) as Hotel | undefined;
  },

  findById(id: string): Hotel | undefined {
    return db.prepare("SELECT * FROM hotels WHERE id = ?").get(id) as Hotel | undefined;
  },

  create(data: { name: string; email: string; password: string }): Hotel {
    const id = generateId();
    db.prepare(
      "INSERT INTO hotels (id, name, email, password) VALUES (?, ?, ?, ?)"
    ).run(id, data.name, data.email, data.password);
    return this.findById(id)!;
  },

  bumpSessionVersion(id: string): number {
    db.prepare(
      "UPDATE hotels SET session_version = session_version + 1, updated_at = datetime('now') WHERE id = ?"
    ).run(id);
    const result = db.prepare("SELECT session_version FROM hotels WHERE id = ?").get(id) as { session_version: number } | undefined;
    return result?.session_version ?? 0;
  },

  updatePassword(id: string, password: string) {
    db.prepare(
      "UPDATE hotels SET password = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(password, id);
  },

  updateConfig(id: string, config: string) {
    db.prepare(
      "UPDATE hotels SET config = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(config, id);
  },

  getFirst(): Hotel | undefined {
    return db.prepare("SELECT * FROM hotels LIMIT 1").get() as Hotel | undefined;
  },
};

export const authAuditLogs = {
  create(data: {
    hotelId?: string | null;
    email: string;
    event: "login_success" | "login_fail" | "register" | "logout" | "password_reset_request" | "password_reset_success";
    ip?: string | null;
    userAgent?: string | null;
    metadata?: string | null;
  }) {
    const id = generateId();
    db.prepare(
      "INSERT INTO auth_audit_logs (id, hotel_id, email, event, ip, user_agent, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(
      id,
      data.hotelId ?? null,
      data.email,
      data.event,
      data.ip ?? null,
      data.userAgent ?? null,
      data.metadata ?? null
    );
  },

  recentByHotel(hotelId: string, limit: number = 50): AuthAuditLog[] {
    return db.prepare(
      "SELECT * FROM auth_audit_logs WHERE hotel_id = ? ORDER BY created_at DESC LIMIT ?"
    ).all(hotelId, limit) as AuthAuditLog[];
  },
};

export const passwordResetTokens = {
  create(data: { hotelId: string; tokenHash: string; expiresAt: string }) {
    const id = generateId();
    db.prepare(
      "INSERT INTO password_reset_tokens (id, hotel_id, token_hash, expires_at) VALUES (?, ?, ?, ?)"
    ).run(id, data.hotelId, data.tokenHash, data.expiresAt);
  },

  findActiveByHash(tokenHash: string): { id: string; hotel_id: string; expires_at: string } | undefined {
    return db.prepare(`
      SELECT id, hotel_id, expires_at
      FROM password_reset_tokens
      WHERE token_hash = ?
        AND used_at IS NULL
        AND expires_at > datetime('now')
      ORDER BY created_at DESC
      LIMIT 1
    `).get(tokenHash) as { id: string; hotel_id: string; expires_at: string } | undefined;
  },

  markUsed(id: string) {
    db.prepare(
      "UPDATE password_reset_tokens SET used_at = datetime('now') WHERE id = ?"
    ).run(id);
  },

  invalidateActiveForHotel(hotelId: string) {
    db.prepare(
      "UPDATE password_reset_tokens SET used_at = datetime('now') WHERE hotel_id = ? AND used_at IS NULL"
    ).run(hotelId);
  },
};

export const feedback = {
  create(data: { messageContent: string; rating: "up" | "down"; comment?: string }) {
    const id = generateId();
    db.prepare(
      "INSERT INTO feedback (id, message_content, rating, comment) VALUES (?, ?, ?, ?)"
    ).run(id, data.messageContent, data.rating, data.comment || null);
    return id;
  },

  stats(): { total: number; up: number; down: number; satisfaction: number } {
    const total = (db.prepare("SELECT COUNT(*) as c FROM feedback").get() as { c: number }).c;
    const up = (db.prepare("SELECT COUNT(*) as c FROM feedback WHERE rating = 'up'").get() as { c: number }).c;
    const down = total - up;
    return { total, up, down, satisfaction: total > 0 ? Math.round((up / total) * 100) : 100 };
  },

  recent(limit: number = 20) {
    return db.prepare(
      "SELECT * FROM feedback ORDER BY created_at DESC LIMIT ?"
    ).all(limit);
  },
};
