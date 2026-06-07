import { guests, interactions } from "@/lib/db";
import { notifyHotelStaff, type EscalationReason } from "@/lib/escalation";

/** Run logging, guest counters, and escalation after the HTTP response is sent. */
export function scheduleChatSideEffects(input: {
  guestMessage: string;
  aiResponse: string;
  language: string;
  guestId?: string | null;
  escalate: boolean;
  reason?: EscalationReason;
}): void {
  void (async () => {
    try {
      await interactions.log({
        guestMessage: input.guestMessage,
        aiResponse: input.aiResponse,
        language: input.language,
        guestId: input.guestId ?? undefined,
      });
      if (input.guestId) {
        await guests.recordMessage(input.guestId);
      }
    } catch (e) {
      console.error("Failed to log interaction:", e);
    }

    if (!input.escalate) return;

    try {
      await notifyHotelStaff({
        guestMessage: input.guestMessage,
        aiResponse: input.aiResponse,
        language: input.language,
        reason: input.reason,
      });
    } catch (e) {
      console.error("Failed to notify staff:", e);
    }
  })();
}
