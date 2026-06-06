/**
 * Telnyx Programmable Voice — TeXML webhook handler
 *
 * Set Voice URL in Telnyx Mission Control → TeXML Applications:
 *   https://<your-domain>/api/telephony/telnyx
 *
 * Optional debug: set TELNYX_DEBUG_WEBHOOK_URL to a webhook.site inbox to
 * mirror every inbound payload while testing.
 */

import { getAssistantResponse } from "@/lib/responseEngine";
import { notifyHotelStaff } from "@/lib/escalation";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";
import { getHotelConfig } from "@/lib/hotelConfig";
import { verify as ed25519Verify } from "@noble/ed25519";
import {
  buildTelnyxConversationXml,
  buildTelnyxHangupXml,
  extractTelnyxCallContext,
  forwardTelnyxDebugPayload,
  parseTelnyxBody,
  type TelnyxWebhookAction,
} from "@/lib/telnyxWebhook";

export const dynamic = "force-dynamic";

function xmlResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function getBaseUrl(req: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (envUrl) return envUrl;
  return new URL(req.url).origin;
}

function gatherActionUrl(req: Request): string {
  return `${getBaseUrl(req)}/api/telephony/telnyx?action=gather`;
}

function verifyTelnyxSignature(req: Request, rawBody: string): boolean {
  const publicKey = process.env.TELNYX_PUBLIC_KEY?.trim();
  const isProd = process.env.NODE_ENV === "production";

  if (!publicKey) {
    if (isProd) {
      console.error("[Telnyx Webhook] TELNYX_PUBLIC_KEY is required in production");
      return false;
    }
    return true;
  }

  const signature = req.headers.get("telnyx-signature-ed25519") ?? "";
  const timestamp = req.headers.get("telnyx-timestamp") ?? "";
  if (!signature || !timestamp) {
    console.error("[Telnyx Webhook] Missing signature headers");
    return false;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const tsSec = parseInt(timestamp, 10);
  if (isNaN(tsSec) || Math.abs(nowSec - tsSec) > 300) {
    console.error("[Telnyx Webhook] Timestamp too old or invalid:", timestamp);
    return false;
  }

  try {
    const sigBytes = Buffer.from(signature, "base64");
    const msgBytes = Buffer.from(`${timestamp}|${rawBody}`);
    const pubBytes = Buffer.from(publicKey, "base64");
    return ed25519Verify(sigBytes, msgBytes, pubBytes);
  } catch (err) {
    console.error("[Telnyx Webhook] Signature verification failed:", err);
    return false;
  }
}

function handleInboundCall(req: Request, language: string): Response {
  const config = getHotelConfig();
  const welcomeText =
    config.branding.welcomeMessage ||
    `Welcome to ${config.branding.hotelName}! How can I assist you today?`;

  return xmlResponse(buildTelnyxConversationXml(welcomeText, gatherActionUrl(req), language));
}

async function handleGather(req: Request, language: string, transcript: string): Promise<Response> {
  const ip = getClientIP(req);
  const limit = checkRateLimit(`telnyx:${ip}`, { maxRequests: 60, windowMs: 60_000 });
  if (!limit.allowed) {
    return xmlResponse(
      buildTelnyxConversationXml(
        "Please hold, our system is momentarily busy. Thank you for your patience.",
        gatherActionUrl(req),
        language
      )
    );
  }

  if (!transcript.trim()) {
    return xmlResponse(
      buildTelnyxConversationXml(
        "I'm sorry, I didn't catch that. Could you please repeat?",
        gatherActionUrl(req),
        language
      )
    );
  }

  const sanitized = transcript.slice(0, 500);
  let aiReply: string;
  let escalate = false;

  try {
    const result = await getAssistantResponse(sanitized, language);
    aiReply = result.reply;
    escalate = result.escalate;

    if (escalate) {
      await notifyHotelStaff({
        guestMessage: sanitized,
        aiResponse: aiReply,
        language,
        reason: result.reason,
      });
    }
  } catch (err) {
    console.error("[Telnyx Webhook] AI error:", err);
    aiReply =
      "I'm sorry, I'm having a temporary issue. Please hold while I transfer you to our front desk.";
    escalate = true;
  }

  if (escalate) {
    return xmlResponse(buildTelnyxHangupXml(aiReply, language));
  }

  return xmlResponse(buildTelnyxConversationXml(aiReply, gatherActionUrl(req), language));
}

async function handleTelnyxPost(req: Request, action: TelnyxWebhookAction): Promise<Response> {
  const { raw, data } = await parseTelnyxBody(req);

  if (!verifyTelnyxSignature(req, raw)) {
    return new Response("Forbidden", { status: 403 });
  }

  const ctx = extractTelnyxCallContext(data);
  forwardTelnyxDebugPayload(req, { action, raw, data, context: ctx });

  console.log(
    `[Telnyx Webhook] action=${action} callId=${ctx.callId} from=${ctx.from} event=${ctx.eventType} transcript="${ctx.transcript.slice(0, 80)}"`
  );

  if (action === "gather") {
    return handleGather(req, ctx.language, ctx.transcript);
  }

  return handleInboundCall(req, ctx.language);
}

export async function POST(req: Request): Promise<Response> {
  const action = (new URL(req.url).searchParams.get("action") ?? "inbound") as TelnyxWebhookAction;
  return handleTelnyxPost(req, action === "gather" ? "gather" : "inbound");
}

/** Health check + sample TeXML preview for Telnyx dashboard validation. */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (url.searchParams.get("preview") === "1") {
    const config = getHotelConfig();
    const language = config.language || "en-US";
    const sample = buildTelnyxConversationXml(
      config.branding.welcomeMessage ||
        `Welcome to ${config.branding.hotelName}! How can I assist you today?`,
      gatherActionUrl(req),
      language
    );
    return xmlResponse(sample);
  }

  return new Response("OK", { status: 200 });
}
