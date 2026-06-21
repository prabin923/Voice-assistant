import type { HotelConfig } from "@/lib/hotelConfig";
import type { PendingBooking } from "@/lib/bookingFlow";

const STRIPE_API = "https://api.stripe.com/v1";

function stripeAuth() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured.");
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function isPaymentEnabled(config: HotelConfig): boolean {
  return isStripeConfigured() && Boolean(config.payment?.enabled) && (config.payment?.depositAmount ?? 0) > 0;
}

export function calculateDeposit(pending: PendingBooking, config: HotelConfig): { amount: number; currency: string; description: string } {
  const payment = config.payment!;
  const room = config.rooms.find((r) => r.name === pending.roomType);
  const currency = (room?.currency || payment.currency || "USD").toLowerCase();

  const nights = Math.max(
    1,
    Math.round(
      (new Date(`${pending.checkOut}T12:00:00`).getTime() -
        new Date(`${pending.checkIn}T12:00:00`).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );
  const totalCents = Math.round((room?.pricePerNight ?? 0) * nights * pending.rooms * 100);

  let depositCents: number;
  let description: string;

  if (payment.depositType === "percentage") {
    depositCents = Math.round((totalCents * payment.depositAmount) / 100);
    description = `${payment.depositAmount}% deposit — ${pending.rooms}× ${pending.roomType} (${nights} night${nights === 1 ? "" : "s"})`;
  } else {
    depositCents = Math.round(payment.depositAmount * 100);
    description = `Deposit — ${pending.rooms}× ${pending.roomType} (${nights} night${nights === 1 ? "" : "s"})`;
  }

  return { amount: depositCents, currency, description };
}

async function stripePost(path: string, params: Record<string, string>): Promise<unknown> {
  const body = new URLSearchParams(params).toString();
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: stripeAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: { message?: string } }).error?.message ?? "Stripe API error");
  return data;
}

export async function stripeGet(path: string): Promise<unknown> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    headers: { Authorization: stripeAuth() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: { message?: string } }).error?.message ?? "Stripe API error");
  return data;
}

export interface CheckoutSession {
  id: string;
  url: string;
}

export async function createDepositCheckoutSession(
  pending: PendingBooking,
  config: HotelConfig,
  hotelId: string,
  appBaseUrl: string
): Promise<CheckoutSession> {
  const { amount, currency, description } = calculateDeposit(pending, config);

  const metadata: Record<string, string> = {
    hotelId,
    roomType: pending.roomType,
    checkIn: pending.checkIn,
    checkOut: pending.checkOut,
    rooms: String(pending.rooms),
    guestName: pending.guestName,
    guestPhone: pending.guestPhone,
    ...(pending.guestEmail ? { guestEmail: pending.guestEmail } : {}),
    ...(pending.specialRequests ? { specialRequests: pending.specialRequests.slice(0, 490) } : {}),
  };

  const params: Record<string, string> = {
    mode: "payment",
    "line_items[0][price_data][currency]": currency,
    "line_items[0][price_data][unit_amount]": String(amount),
    "line_items[0][price_data][product_data][name]": description,
    "line_items[0][quantity]": "1",
    success_url: `${appBaseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appBaseUrl}/assistant`,
    "payment_intent_data[description]": description,
    "customer_email": pending.guestEmail ?? "",
  };

  Object.entries(metadata).forEach(([k, v]) => {
    params[`metadata[${k}]`] = v;
    params[`payment_intent_data[metadata][${k}]`] = v;
  });

  const session = await stripePost("/checkout/sessions", params) as { id: string; url: string };
  return { id: session.id, url: session.url };
}

export interface VerifiedSession {
  paid: boolean;
  metadata: {
    hotelId?: string;
    roomType?: string;
    checkIn?: string;
    checkOut?: string;
    rooms?: string;
    guestName?: string;
    guestPhone?: string;
    guestEmail?: string;
    guestId?: string;
    specialRequests?: string;
  };
  amountTotal: number;
  currency: string;
}

export async function verifyCheckoutSession(sessionId: string): Promise<VerifiedSession> {
  const session = await stripeGet(`/checkout/sessions/${sessionId}`) as {
    payment_status: string;
    metadata: Record<string, string>;
    amount_total: number;
    currency: string;
  };
  return {
    paid: session.payment_status === "paid",
    metadata: session.metadata ?? {},
    amountTotal: session.amount_total,
    currency: session.currency,
  };
}
