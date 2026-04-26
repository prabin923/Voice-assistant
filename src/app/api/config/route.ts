// ============================================================
// CONFIG API — GET/PUT/DELETE /api/config
// SECURITY: All mutating operations require authentication.
// GET is public (frontend needs config for branding/display).
// ============================================================

import { NextResponse } from 'next/server';
import { getHotelConfig, updateHotelConfig, resetHotelConfig } from '@/lib/hotelConfig';
import { requireAuth } from '@/lib/auth';

// Public: frontend needs branding/config to render
export async function GET() {
  const config = getHotelConfig();
  // Strip sensitive fields for public access
  const { telephony, ...publicConfig } = config;
  return NextResponse.json(publicConfig);
}

// Protected: only authenticated hotel admins can update config
export async function PUT(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const updates = await req.json();
    const updated = updateHotelConfig(updates);
    return NextResponse.json({ success: true, config: updated });
  } catch {
    return NextResponse.json(
      { error: 'Failed to update configuration.' },
      { status: 500 }
    );
  }
}

// Protected: only authenticated hotel admins can reset config
export async function DELETE() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const config = resetHotelConfig();
  return NextResponse.json({ success: true, config, message: 'Configuration reset to defaults.' });
}
