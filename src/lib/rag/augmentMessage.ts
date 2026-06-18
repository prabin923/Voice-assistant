import type { HotelConfig } from "@/lib/hotelConfig";
import {
  buildRetrievalQuery,
  ragTimeoutMs,
  retrieveRelevantChunks,
  type RetrievedChunk,
} from "@/lib/rag/knowledgeIndex";

export type ChatTurn = { role: string; content: string };

/** Serialize hotel config for LLM context (full or compact). */
export function buildHotelDataBlock(config: HotelConfig, compact: boolean): string {
  if (compact) {
    return `- ${config.branding.hotelName}, ${config.contact.city}
- Phone: ${config.contact.phone}
- Check-in ${config.policies.checkInTime}, check-out ${config.policies.checkOutTime}
- Rooms: ${config.rooms.map((r) => `${r.name} ${r.currency}${r.pricePerNight}/night`).join("; ")}
- Amenities: ${config.amenities.map((a) => a.name).join(", ")}
- Dining: ${config.dining.map((d) => d.name).join(", ") || "see FAQ"}`;
  }

  const diningBlock =
    config.dining?.length > 0
      ? config.dining.map((d) => `${d.name} (${d.cuisine}): ${d.hours}`).join("; ")
      : "None configured.";
  const faqBlock =
    config.customFAQ?.length > 0
      ? config.customFAQ.map((f) => `${f.question} → ${f.answer}`).join("; ")
      : "None configured.";

  return `- Hotel: ${config.branding.hotelName}, ${config.contact.address}, ${config.contact.city}
- Phone: ${config.contact.phone}, Email: ${config.contact.email}
- Check-in/out: ${config.policies.checkInTime} / ${config.policies.checkOutTime}
- Cancellation: ${config.policies.cancellationPolicy}
- Pets: ${config.policies.petPolicy}
- Smoking: ${config.policies.smokingPolicy}
- Children: ${config.policies.childPolicy}
- Amenities: ${config.amenities.map((a) => `${a.name}${a.hours ? ` (${a.hours})` : ""}`).join("; ")}
- Dining: ${diningBlock}
- FAQ: ${faqBlock}
- Rooms: ${config.rooms
    .map(
      (r) =>
        `${r.name}: ${r.currency}${r.pricePerNight}/night, max ${r.maxOccupancy} — ${r.description}`,
    )
    .join("; ")}`;
}

function fullContextMessage(config: HotelConfig, message: string, channel: "voice" | "text") {
  const fullData = buildHotelDataBlock(config, channel === "voice");
  return {
    usedRag: false,
    message: `HOTEL DATA:\n${fullData}\n\nGUEST MESSAGE:\n${message}`,
  };
}

function fastVoiceFallbackMessage(config: HotelConfig, message: string) {
  const concise = [
    `- ${config.branding.hotelName} | ${config.contact.phone} | ${config.contact.city}`,
    `- Check-in ${config.policies.checkInTime}, check-out ${config.policies.checkOutTime}`,
    `- Rooms: ${config.rooms.slice(0, 3).map((r) => `${r.name} ${r.currency}${r.pricePerNight}`).join("; ")}`,
    `- Dining: ${config.dining.slice(0, 3).map((d) => d.name).join(", ") || "not listed"}`,
  ].join("\n");
  return {
    usedRag: false,
    message:
      `HOTEL FACTS:\n${concise}` +
      "\nVOICE MODE: Answer in 1-2 short conversational sentences." +
      `\n\nGUEST MESSAGE:\n${message}`,
  };
}

export async function augmentUserMessageWithHotelContext(
  message: string,
  history: ChatTurn[],
  config: HotelConfig,
  channel: "voice" | "text"
): Promise<{ message: string; usedRag: boolean }> {
  try {
    const topK = channel === "voice" ? 3 : 10;
    const query = buildRetrievalQuery(message, history);

    const chunks = await Promise.race([
      retrieveRelevantChunks(query, {
        topK,
        minScore: channel === "voice" ? 0.28 : 0.32,
        preferFastLexical: channel === "voice",
        lexicalOnly: channel === "voice",
      }),
      new Promise<RetrievedChunk[]>((resolve) =>
        setTimeout(() => resolve([]), ragTimeoutMs(channel))
      ),
    ]);

    if (chunks.length > 0) {
        const dialogue = chunks.filter((c) => c.category === "dialogue");
        const factual = chunks.filter((c) => c.category !== "dialogue");
        const selected =
          channel === "voice" && dialogue.length > 0
            ? [...dialogue.slice(0, 2), ...factual.slice(0, Math.max(topK - 2, 2))]
            : chunks;

        const core = `- ${config.branding.hotelName} | ${config.contact.phone} | ${config.contact.city}`;
        const facts = [core, ...selected.map((c) => `- ${c.title}: ${c.content}`)].join("\n");
        const voiceHint =
          channel === "voice"
            ? dialogue.length > 0
              ? "\nVOICE MODE: Match the natural tone of the DIALOGUE EXAMPLES above. Answer in 1–2 spoken sentences — warm and human, not a brochure."
              : "\nVOICE MODE: Answer in 1–2 spoken sentences. Sound warm and human — not like reading a brochure."
            : dialogue.length > 0
              ? "\nMatch the conversational tone of the DIALOGUE EXAMPLES when helpful."
              : "";
        return {
          usedRag: true,
          message: `RELEVANT HOTEL FACTS:\n${facts}${voiceHint}\n\nGUEST MESSAGE:\n${message}`,
        };
    }
  } catch (err) {
    console.warn("[RAG] Augment failed, using full hotel data:", err);
  }

  if (channel === "voice") {
    return fastVoiceFallbackMessage(config, message);
  }
  return fullContextMessage(config, message, channel);
}
