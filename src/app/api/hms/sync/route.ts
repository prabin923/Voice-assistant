import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { validateCsrf } from "@/lib/csrf";
import { ensureHotelConfigLoaded, updateHotelConfig } from "@/lib/hotelConfig";
import { normalizeHmsPayload, validateHmsEndpoint } from "@/lib/hmsIntegration";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type HmsSyncBody = {
  endpointUrl?: string;
  authHeader?: string;
  apiKey?: string;
  payload?: unknown;
};

async function fetchHmsPayload(body: HmsSyncBody): Promise<unknown> {
  if (body.payload) return body.payload;
  if (!body.endpointUrl?.trim()) throw new Error("Provide an HMS endpoint URL or paste a JSON payload.");

  const url = validateHmsEndpoint(body.endpointUrl.trim());
  const headers = new Headers({ Accept: "application/json" });
  if (body.apiKey?.trim()) {
    const headerName = body.authHeader?.trim() || "Authorization";
    headers.set(headerName, headerName.toLowerCase() === "authorization" ? `Bearer ${body.apiKey.trim()}` : body.apiKey.trim());
  }

  const res = await fetch(url, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    throw new Error(`HMS responded with ${res.status}.`);
  }
  return res.json();
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const csrfError = await validateCsrf(req);
  if (csrfError) return csrfError;

  try {
    const body = await req.json().catch(() => ({})) as HmsSyncBody;
    const payload = await fetchHmsPayload(body);
    const current = await ensureHotelConfigLoaded({ hotelId: auth.session.hotelId });
    const normalized = normalizeHmsPayload(payload, current);
    const updated = await updateHotelConfig(normalized.updates, auth.session.hotelId);

    return NextResponse.json({
      ok: true,
      counts: normalized.counts,
      config: updated,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "HMS sync failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
