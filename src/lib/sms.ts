/**
 * Guest SMS via TingTing (optional). Logs when not configured.
 */

export async function sendBookingSms(input: {
  toPhone: string;
  hotelName: string;
  bookingId: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
}): Promise<void> {
  const apiKey = process.env.TINGTING_API_KEY?.trim();
  const phone = input.toPhone.replace(/[^\d+]/g, "");
  if (!phone || phone.length < 8) return;

  const shortId = input.bookingId.slice(0, 8).toUpperCase();
  const message = `${input.hotelName}: Booking #${shortId} confirmed. ${input.roomType}, ${input.checkIn} to ${input.checkOut}.`;

  if (!apiKey) {
    console.log("[SMS] Booking confirmation (TINGTING_API_KEY not set):");
    console.log(`  To: ${phone}`);
    console.log(`  Body: ${message}`);
    return;
  }

  try {
    const res = await fetch("https://tingting.io/api/v1/sms/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: phone, message }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn("[SMS] TingTing failed:", res.status, body.slice(0, 120));
    }
  } catch (err) {
    console.warn("[SMS] TingTing error:", err);
  }
}
