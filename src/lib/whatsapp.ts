/** Twilio WhatsApp helpers — send messages and parse inbound webhooks. */

export function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
    process.env.TWILIO_AUTH_TOKEN?.trim() &&
    process.env.TWILIO_WHATSAPP_NUMBER?.trim()
  );
}

function twilioAuth(): string {
  const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
  const token = process.env.TWILIO_AUTH_TOKEN!.trim();
  return "Basic " + Buffer.from(`${sid}:${token}`).toString("base64");
}

export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
  const from = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER!.trim()}`;

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: twilioAuth(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }).toString(),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    console.error("[WhatsApp] Send failed:", err.message ?? res.status);
  }
}

/** Parse Twilio's URL-encoded webhook body into a plain object. */
export function parseTwilioBody(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of raw.split("&")) {
    const [key, ...rest] = pair.split("=");
    if (key) result[decodeURIComponent(key)] = decodeURIComponent(rest.join("=").replace(/\+/g, " "));
  }
  return result;
}

/** Build a TwiML response that sends a WhatsApp message back inline. */
export function twimlReply(body: string): Response {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
  return new Response(xml, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

/** Validate that a request came from Twilio (X-Twilio-Signature). */
export async function validateTwilioSignature(
  req: Request,
  rawBody: string
): Promise<boolean> {
  const secret = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!secret) return false;

  const signature = req.headers.get("x-twilio-signature");
  if (!signature) return false;

  try {
    const url = req.url;
    const params = parseTwilioBody(rawBody);
    const sortedKeys = Object.keys(params).sort();
    const str = url + sortedKeys.map((k) => k + params[k]).join("");

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"]
    );
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(str));
    const expected = Buffer.from(mac).toString("base64");
    return expected === signature;
  } catch {
    return false;
  }
}
