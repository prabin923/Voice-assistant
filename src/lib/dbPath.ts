import path from "path";
import fs from "fs";

/** Writable SQLite path: Vercel serverless only allows writes under /tmp. */
export function resolveDatabasePath(): string {
  const fileName = "hotel.db";
  if (process.env.VERCEL) {
    return path.join("/tmp", fileName);
  }
  return path.join(process.cwd(), fileName);
}

export function ensureDatabaseDirectory(dbPath: string): void {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
