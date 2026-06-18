import type { HotelConfig } from "@/lib/hotelConfig";
import type { HotelKnowledgeChunk } from "@/lib/rag/chunkHotelConfig";

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

function example(
  key: string,
  title: string,
  guest: string,
  assistant: string
): HotelKnowledgeChunk {
  return {
    chunkKey: `dialogue:${key}`,
    category: "dialogue",
    title,
    content: `Guest: "${guest}"\nAssistant: "${assistant}"`,
  };
}

/** Sample guest–concierge exchanges for RAG (teaches natural tone and phrasing). */
export function buildConversationExampleChunks(config: HotelConfig): HotelKnowledgeChunk[] {
  const name = config.branding.hotelName;
  const phone = config.contact.phone;
  const city = config.contact.city;
  const checkIn = config.policies.checkInTime;
  const checkOut = config.policies.checkOutTime;
  const cheapest = config.rooms.reduce((a, b) => (a.pricePerNight < b.pricePerNight ? a : b));
  const dining = config.dining[0];

  const chunks: HotelKnowledgeChunk[] = [
    example(
      "greeting",
      "Welcome greeting",
      "Hi, I just arrived.",
      `Welcome to ${name}! I'm happy to help — are you checking in, or do you have a question about your stay?`
    ),
    example(
      "check-in",
      "Check-in time",
      "What time is check-in?",
      `Check-in starts at ${checkIn}. If you're arriving earlier, let me know — we'll do our best to accommodate you.`
    ),
    example(
      "check-out",
      "Check-out time",
      "When do I need to check out?",
      `Checkout is at ${checkOut}. If you need a little extra time, just ask the front desk and we'll see what we can do.`
    ),
    example(
      "cancellation",
      "Cancellation policy",
      "Can I cancel my reservation?",
      `Of course. ${config.policies.cancellationPolicy} Would you like help changing or cancelling a booking?`
    ),
    example(
      "room-booking",
      "Room availability",
      "Do you have any rooms available this weekend?",
      `I'd be happy to check. What dates are you thinking, and how many guests? Our ${cheapest.name} starts around ${cheapest.currency}${cheapest.pricePerNight} per night.`
    ),
    example(
      "contact",
      "Front desk contact",
      "How do I reach the front desk?",
      `You can call us at ${phone}, or just ask me here — I'm the virtual concierge for ${name} in ${city}.`
    ),
  ];

  if (dining) {
    chunks.push(
      example(
        "dining-hours",
        `${dining.name} hours`,
        `Is ${dining.name} open tonight?`,
        `${dining.name} serves ${dining.cuisine.toLowerCase()} — ${dining.hours}. Want me to reserve a table for you?`
      ),
      example(
        "dining-reservation",
        "Table reservation",
        "Can you book me a table for two tomorrow at seven?",
        `Absolutely — which restaurant would you prefer, and may I have a name and phone number for the reservation?`
      )
    );
  }

  for (const amenity of config.amenities.slice(0, 4)) {
    const hours = amenity.hours ? ` It's open ${amenity.hours}.` : "";
    chunks.push(
      example(
        `amenity-${slug(amenity.name)}`,
        amenity.name,
        `Do you have a ${amenity.name.toLowerCase()}?`,
        `Yes — ${amenity.description}.${hours} Anything else you'd like to know?`
      )
    );
  }

  for (let i = 0; i < config.customFAQ.length; i++) {
    const faq = config.customFAQ[i];
    const question = faq.question.trim();
    const answer = faq.answer.trim();
    if (!question || !answer) continue;
    const guestLine = question.endsWith("?") ? question : `${question}?`;
    chunks.push(
      example(
        `faq-${i}`,
        question,
        guestLine,
        answer.endsWith(".") || answer.endsWith("!") || answer.endsWith("?") ? answer : `${answer}.`
      )
    );
  }

  chunks.push(
    example(
      "clarify",
      "Clarifying question",
      "I need some information.",
      `Sure — what would you like to know about your stay at ${name}?`
    ),
    example(
      "thanks",
      "Closing thanks",
      "Thanks, that's all.",
      config.branding.farewellMessage || `You're welcome! Enjoy your stay at ${name}.`
    )
  );

  return chunks;
}
