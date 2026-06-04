/** Gemini 3.1 Flash Live — Live API (WebSocket) only; not valid for generateContent. */
export const GEMINI_LIVE_MODEL =
  process.env.GEMINI_LIVE_MODEL?.trim() || "gemini-3.1-flash-live-preview";

/** REST chat + STT (Gemini 3 Flash). Override with GEMINI_MODEL in .env.local. */
export const GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";
