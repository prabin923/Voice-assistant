import { NextResponse } from 'next/server';
import { ensureHotelConfigLoaded, updateHotelConfig, resetHotelConfig } from '@/lib/hotelConfig';
import { requireAuth, getSession } from '@/lib/auth';
import { validateCsrf } from "@/lib/csrf";
import { isAiConfigured } from "@/lib/ai";
import { isGeminiConfigured, isSttConfigured } from "@/lib/gemini";
import { isServerTtsConfigured } from "@/lib/serverTts";
import { isFreeVoiceStack } from "@/lib/voiceStack";
import { runWithTenant, TenantNotFoundError, tenantSlugFromRequest } from "@/lib/tenantContext";
import { hotels } from "@/lib/db";

export const dynamic = "force-dynamic";

function publicConfigPayload(config: Awaited<ReturnType<typeof ensureHotelConfigLoaded>>, slug?: string) {
  const { telephony, ...publicConfig } = config;
  return {
    ...publicConfig,
    hotelSlug: slug,
    aiReady: isAiConfigured(),
    geminiLiveReady: isGeminiConfigured(),
    sttReady: isSttConfigured(),
    serverTtsReady: isServerTtsConfigured(),
    nemotronVoiceReady: isServerTtsConfigured(),
    voiceStack: isFreeVoiceStack() ? "free" : "cloud",
  };
}

// Public: frontend needs branding/config to render (optionally per-tenant via ?hotel=slug)
export async function GET(req: Request) {
  const slug = tenantSlugFromRequest(req);
  const session = await getSession();

  try {
    if (slug) {
      return await runWithTenant({ slug }, async () => {
        const config = await ensureHotelConfigLoaded({ slug });
        return NextResponse.json(publicConfigPayload(config, slug));
      });
    }

    if (session) {
      const hotel = await hotels.findById(session.hotelId);
      return await runWithTenant({ hotelId: session.hotelId }, async () => {
        const config = await ensureHotelConfigLoaded({ hotelId: session.hotelId });
        return NextResponse.json(publicConfigPayload(config, hotel?.slug ?? undefined));
      });
    }

    const config = await ensureHotelConfigLoaded();
    return NextResponse.json(publicConfigPayload(config));
  } catch (err) {
    if (err instanceof TenantNotFoundError) {
      return NextResponse.json({ error: "Hotel not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to load configuration." }, { status: 500 });
  }
}

// Protected: only authenticated hotel admins can update config
export async function PUT(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const csrfError = await validateCsrf(req);
  if (csrfError) return csrfError;

  try {
    const updates = await req.json();
    const updated = await updateHotelConfig(updates, auth.session.hotelId);
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

  const config = await resetHotelConfig(auth.session.hotelId);
  return NextResponse.json({ success: true, config, message: 'Configuration reset to defaults.' });
}
