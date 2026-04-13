import Database from "better-sqlite3";
import path from "path";

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

  if (process.env.NODE_ENV !== "production") globalForDb.db = db;
  return db;
}

export const db = getDb();

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
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
};
