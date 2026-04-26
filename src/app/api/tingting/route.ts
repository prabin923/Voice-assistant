import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

/**
 * TingTing API Proxy Integration
 * SECURITY: Requires authentication + action allowlist to prevent SSRF
 */

// Allowlist of valid TingTing API actions
const ALLOWED_ACTIONS = new Set([
  "voice/notify",
  "voice/query",
  "conversation/start",
  "conversation/reply",
  "status",
]);

export async function POST(req: Request) {
  // SECURITY: Require admin authentication
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  // Rate limit
  const ip = getClientIP(req);
  const limit = checkRateLimit(`tingting:${ip}`, { maxRequests: 30, windowMs: 60000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const { action, payload } = await req.json();
    const apiKey = process.env.TINGTING_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'TingTing API Key missing' }, { status: 501 });
    }

    // SECURITY: Validate action against allowlist to prevent SSRF
    if (!action || typeof action !== "string") {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    const cleanAction = action.replace(/^\/+/, "").replace(/\.{2,}/g, "");
    if (!ALLOWED_ACTIONS.has(cleanAction)) {
      return NextResponse.json(
        { error: `Invalid action. Allowed: ${[...ALLOWED_ACTIONS].join(", ")}` },
        { status: 400 }
      );
    }

    const response = await fetch(`https://tingting.io/api/v1/${cleanAction}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload || {}),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('TingTing Proxy Error:', error.message);
    return NextResponse.json({ error: 'TingTing integration failed' }, { status: 500 });
  }
}
