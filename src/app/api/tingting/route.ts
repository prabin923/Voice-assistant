import { NextResponse } from 'next/server';

/**
 * TingTing API Proxy Integration
 * Documented at: https://tingting.readthedocs.io/
 */
export async function POST(req: Request) {
  try {
    const { action, payload } = await req.json();
    const apiKey = process.env.TINGTING_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'TingTing API Key missing' }, { status: 501 });
    }

    // Example action: Create a voice notification or query their Riri engine
    // We proxy to TingTing's specialized conversation engine
    const response = await fetch(`https://tingting.io/api/v1/${action}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('TingTing Proxy Error:', error);
    return NextResponse.json({ error: 'TingTing integration failed' }, { status: 500 });
  }
}
