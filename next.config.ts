import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";

// Load .env.local before config is evaluated (helps dev when env was added after server start)
loadEnvConfig(process.cwd());

const embedOrigins = process.env.EMBED_ALLOWED_ORIGINS?.trim() || "*";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ["nodemailer", "pg"],
  async headers() {
    const secureHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
    ];

    return [
      {
        source: "/embed/:path*",
        headers: [
          ...secureHeaders,
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: http:",
              "font-src 'self' data:",
              "connect-src 'self' https: wss:",
              "media-src 'self' blob:",
              `frame-ancestors ${embedOrigins}`,
            ].join("; "),
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          ...secureHeaders,
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: http:",
              "font-src 'self' data:",
              "connect-src 'self' https: wss:",
              "media-src 'self' blob:",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

