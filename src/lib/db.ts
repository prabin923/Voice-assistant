import Database from "better-sqlite3";
import path from "path";
import { randomUUID } from "crypto";

const dbPath = path.join(process.cwd(), "hotel.db");

const globalForDb = globalThis as unknown as { db: Database.Database };

function getDb(): Database.Database {
  if (globalForDb.db) return globalForDb.db;

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS hotels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      config TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

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

  if (process.env.NODE_ENV !== "production") globalForDb.db = db;
  return db;
}

export const db = getDb();

function generateId(): string {
  return randomUUID();
}

export interface Hotel {
  id: string;
  name: string;
  email: string;
  password: string;
  config: string;
  created_at: string;
  updated_at: string;
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

  updateConfig(id: string, config: string) {
    db.prepare(
      "UPDATE hotels SET config = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(config, id);
  },

  getFirst(): Hotel | undefined {
    return db.prepare("SELECT * FROM hotels LIMIT 1").get() as Hotel | undefined;
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
