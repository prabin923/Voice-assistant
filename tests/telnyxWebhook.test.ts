import { describe, expect, it } from "vitest";
import {
  extractTelnyxCallContext,
  flattenTelnyxPayload,
  parseTelnyxBody,
} from "@/lib/telnyxWebhook";

describe("telnyxWebhook", () => {
  it("parses TeXML gather form payload (SpeechResult)", async () => {
    const body = new URLSearchParams({
      SpeechResult: "What room types do you offer?",
      Confidence: "0.91",
      CallSid: "CA123",
      From: "+15551234567",
      To: "+15559876543",
      Language: "en-US",
    }).toString();

    const req = new Request("https://example.com/api/telephony/telnyx?action=gather", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const { data } = await parseTelnyxBody(req);
    const ctx = extractTelnyxCallContext(data);

    expect(ctx.transcript).toBe("What room types do you offer?");
    expect(ctx.confidence).toBeCloseTo(0.91);
    expect(ctx.callId).toBe("CA123");
    expect(ctx.from).toBe("+15551234567");
    expect(ctx.language).toBe("en-US");
  });

  it("parses lowercase speech_result variant", () => {
    const ctx = extractTelnyxCallContext({
      speech_result: "I need a deluxe room",
      call_control_id: "v3:abc",
      from: "+9779811002233",
      to: "+15550001111",
      language: "en_US",
    });

    expect(ctx.transcript).toBe("I need a deluxe room");
    expect(ctx.callId).toBe("v3:abc");
    expect(ctx.language).toBe("en-US");
  });

  it("flattens nested Telnyx JSON payloads", () => {
    const flat = flattenTelnyxPayload({
      data: {
        event_type: "call.speak.ended",
        payload: {
          call_control_id: "v3:xyz",
          from: "+15551230000",
          to: "+15559990000",
          transcription: "Hello front desk",
          confidence: "0.88",
        },
      },
    });

    expect(flat["data.event_type"]).toBe("call.speak.ended");
    expect(flat["data.payload.call_control_id"]).toBe("v3:xyz");
    expect(flat["data.payload.transcription"]).toBe("Hello front desk");

    const ctx = extractTelnyxCallContext(flat);
    expect(ctx.transcript).toBe("Hello front desk");
    expect(ctx.callId).toBe("v3:xyz");
    expect(ctx.confidence).toBeCloseTo(0.88);
  });
});
