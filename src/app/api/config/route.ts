// ============================================================
// CONFIG API — GET /api/config
// Returns the current hotel configuration for the frontend.
// ============================================================

import { NextResponse } from 'next/server';
import { getHotelConfig, updateHotelConfig, resetHotelConfig } from '@/lib/hotelConfig';

export async function GET() {
  const config = getHotelConfig();
  return NextResponse.json(config);
}

export async function PUT(req: Request) {
  try {
    const updates = await req.json();
    const updated = updateHotelConfig(updates);
    return NextResponse.json({ success: true, config: updated });
  } catch (error) {
    console.error('Config update error:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration.' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const config = resetHotelConfig();
  return NextResponse.json({ success: true, config, message: 'Configuration reset to defaults.' });
}
