import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";

// Load .env.local before config is evaluated (helps dev when env was added after server start)
loadEnvConfig(process.cwd());

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ["better-sqlite3", "nodemailer"],
};

export default nextConfig;

