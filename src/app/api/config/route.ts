// ============================================================
// CONFIG API — GET/PUT/DELETE /api/config
// SECURITY: All mutating operations require authentication.
// GET is public (frontend needs config for branding/display).
// ============================================================

import { NextResponse } from 'next/server';
import { ensureHotelConfigLoaded, updateHotelConfig, resetHotelConfig } from '@/lib/hotelConfig';
import { requireAuth } from '@/lib/auth';
import { validateCsrf } from "@/lib/csrf";
import { isAiConfigured } from "@/lib/ai";
import { isGeminiConfigured, isSttConfigured } from "@/lib/gemini";
import { isServerTtsConfigured } from "@/lib/serverTts";
import { isFreeVoiceStack } from "@/lib/voiceStack";

export const dynamic = "force-dynamic";

// Public: frontend needs branding/config to render
export async function GET() {
  const config = await ensureHotelConfigLoaded();
  // Strip sensitive fields for public access
  const { telephony, ...publicConfig } = config;
  return NextResponse.json({
    ...publicConfig,
    aiReady: isAiConfigured(),
    geminiLiveReady: isGeminiConfigured(),
    sttReady: isSttConfigured(),
    serverTtsReady: isServerTtsConfigured(),
    nemotronVoiceReady: isServerTtsConfigured(),
    voiceStack: isFreeVoiceStack() ? "free" : "cloud",
  });
}

// Protected: only authenticated hotel admins can update config
export async function PUT(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const csrfError = await validateCsrf(req);
  if (csrfError) return csrfError;

  try {
    const updates = await req.json();
    const updated = await updateHotelConfig(updates);
    return NextResponse.json({ success: true, config: updated });
  } catch {
    return NextResponse.json(
      { error: 'Failed to update configuration.' },
      { status: 500 }
    );
  }
}

// Protected: only authenticated hotel admins can reset config
export async function DELETE(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const csrfError = await validateCsrf(req);
  if (csrfError) return csrfError;

  const config = await resetHotelConfig();
  return NextResponse.json({ success: true, config, message: 'Configuration reset to defaults.' });
}
