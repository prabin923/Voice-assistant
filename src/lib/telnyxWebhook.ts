import { getHotelConfig } from "@/lib/hotelConfig";

export type TelnyxWebhookAction = "inbound" | "gather";

export interface TelnyxCallContext {
  callId: string;
  from: string;
  to: string;
  language: string;
  transcript: string;
  confidence: number | null;
  eventType: string;
  raw: Record<string, string>;
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

/** Flatten Telnyx JSON (including nested data.payload) into string key/value pairs. */
export function flattenTelnyxPayload(input: unknown): Record<string, string> {
  const out: Record<string, string> = {};

  const walk = (value: unknown, prefix = "") => {
    if (value == null) return;

    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, prefix ? `${prefix}.${index}` : String(index)));
      return;
    }

    if (typeof value === "object") {
      for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
        const next = prefix ? `${prefix}.${key}` : key;
        if (nested != null && typeof nested === "object" && !Array.isArray(nested)) {
          walk(nested, next);
        } else {
          const text = asString(nested);
          if (text) out[next] = text;
        }
      }
      return;
    }

    const text = asString(value);
    if (text && prefix) out[prefix] = text;
  };

  walk(input);
  return out;
}

export async function parseTelnyxBody(req: Request): Promise<{ raw: string; data: Record<string, string> }> {
  const raw = await req.text();
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(raw);
    const data: Record<string, string> = {};
    for (const [key, value] of params.entries()) data[key] = value;
    return { raw, data };
  }

  if (!raw.trim()) return { raw, data: {} };

  try {
    const json = JSON.parse(raw) as unknown;
    return { raw, data: flattenTelnyxPayload(json) };
  } catch {
    return { raw, data: {} };
  }
}

function firstValue(data: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const direct = data[key]?.trim();
    if (direct) return direct;

    const lower = key.toLowerCase();
    for (const [k, v] of Object.entries(data)) {
      if (k.toLowerCase() === lower && v.trim()) return v.trim();
    }
  }
  return "";
}

export function extractTelnyxCallContext(
  data: Record<string, string>,
  fallbackLanguage?: string
): TelnyxCallContext {
  const config = getHotelConfig();
  const language =
    firstValue(data, [
      "language",
      "Language",
      "speech_language",
      "data.payload.language",
    ]) ||
    fallbackLanguage ||
    config.language ||
    "en-US";

  const transcript = firstValue(data, [
    "SpeechResult",
    "speech_result",
    "transcript",
    "TranscriptionText",
    "data.payload.transcription",
    "data.payload.text",
    "data.payload.speech",
  ]);

  const confidenceRaw = firstValue(data, ["Confidence", "confidence", "data.payload.confidence"]);
  const confidence = confidenceRaw ? Number(confidenceRaw) : null;

  return {
    callId: firstValue(data, [
      "CallSid",
      "call_sid",
      "call_control_id",
      "data.payload.call_control_id",
      "data.id",
    ]),
    from: firstValue(data, ["From", "from", "data.payload.from", "data.payload.caller_id_number"]),
    to: firstValue(data, ["To", "to", "data.payload.to", "data.payload.called_number"]),
    language: language.replace("_", "-"),
    transcript,
    confidence: Number.isFinite(confidence) ? confidence : null,
    eventType: firstValue(data, ["event", "Event", "data.event_type"]),
    raw: data,
  };
}

export function resolveTelnyxTtsVoice(): string {
  const envVoice = process.env.TELNYX_TTS_VOICE?.trim();
  if (envVoice) return envVoice;

  const configVoice = getHotelConfig().telephony?.telnyxVoice?.trim();
  return configVoice || "Telnyx.NaturalHD";
}

export function xmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildTelnyxConversationXml(text: string, actionUrl: string, language: string): string {
  const voice = resolveTelnyxTtsVoice();
  const lang = language.replace("_", "-");
  const safeText = xmlEscape(text);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${lang}">${safeText}</Say>
  <Gather input="speech" action="${xmlEscape(actionUrl)}" method="POST"
    language="${lang}" speechTimeout="3" speechModel="phone_call"
    enhanced="true" timeout="6">
  </Gather>
  <Say voice="${voice}" language="${lang}">I didn't catch that. Goodbye!</Say>
  <Hangup />
</Response>`;
}

export function buildTelnyxHangupXml(text: string, language: string): string {
  const voice = resolveTelnyxTtsVoice();
  const lang = language.replace("_", "-");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${lang}">${xmlEscape(text)}</Say>
  <Hangup />
</Response>`;
}

/** Fire-and-forget copy of inbound Telnyx payloads to webhook.site (or similar) for debugging. */
export function forwardTelnyxDebugPayload(
  req: Request,
  input: {
    action: TelnyxWebhookAction;
    raw: string;
    data: Record<string, string>;
    context: TelnyxCallContext;
  }
): void {
  const debugUrl = process.env.TELNYX_DEBUG_WEBHOOK_URL?.trim();
  if (!debugUrl) return;

  void fetch(debugUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "voice-assistant/telnyx",
      receivedAt: new Date().toISOString(),
      action: input.action,
      context: input.context,
      parsed: input.data,
      rawBody: input.raw,
      headers: {
        contentType: req.headers.get("content-type"),
        userAgent: req.headers.get("user-agent"),
      },
    }),
  }).catch((err) => {
    console.warn("[Telnyx Webhook] Debug forward failed:", err);
  });
}
