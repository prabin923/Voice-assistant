import type { HotelConfig } from "@/lib/hotelConfig";

export type HotelKnowledgeChunk = {
  chunkKey: string;
  category: string;
  title: string;
  content: string;
};

/** Split hotel config into embeddable chunks for semantic retrieval. */
export function chunkHotelConfig(config: HotelConfig): HotelKnowledgeChunk[] {
  const chunks: HotelKnowledgeChunk[] = [];

  chunks.push({
    chunkKey: "branding:main",
    category: "branding",
    title: config.branding.hotelName,
    content: `${config.branding.hotelName}. Tagline: ${config.branding.tagline}. Welcome message: ${config.branding.welcomeMessage}`,
  });

  chunks.push({
    chunkKey: "contact:main",
    category: "contact",
    title: "Contact and location",
    content: `Phone: ${config.contact.phone}. Email: ${config.contact.email}. Address: ${config.contact.address}, ${config.contact.city}, ${config.contact.country}.${config.contact.website ? ` Website: ${config.contact.website}.` : ""}`,
  });

  const policyEntries: [string, string][] = [
    ["check-in", `Check-in time: ${config.policies.checkInTime}`],
    ["check-out", `Check-out time: ${config.policies.checkOutTime}`],
    ["cancellation", `Cancellation policy: ${config.policies.cancellationPolicy}`],
    ["pets", `Pet policy: ${config.policies.petPolicy}`],
    ["smoking", `Smoking policy: ${config.policies.smokingPolicy}`],
    ["children", `Child policy: ${config.policies.childPolicy}`],
    ["extra-bed", `Extra bed policy: ${config.policies.extraBedPolicy}`],
  ];

  for (const [key, text] of policyEntries) {
    chunks.push({
      chunkKey: `policy:${key}`,
      category: "policy",
      title: key.replace("-", " "),
      content: text,
    });
  }

  for (const room of config.rooms) {
    const key = room.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    chunks.push({
      chunkKey: `room:${key}`,
      category: "room",
      title: room.name,
      content: `${room.name}: ${room.currency}${room.pricePerNight}/night, max ${room.maxOccupancy} guests. ${room.description}${room.category ? ` Category: ${room.category}.` : ""}${room.imageUrl ? ` Image: ${room.imageUrl}` : ""}`,
    });
  }

  for (let i = 0; i < config.dining.length; i++) {
    const venue = config.dining[i];
    chunks.push({
      chunkKey: `dining:${i}`,
      category: "dining",
      title: venue.name,
      content: `${venue.name} (${venue.cuisine}): ${venue.hours}. ${venue.description}`,
    });
  }

  for (let i = 0; i < config.amenities.length; i++) {
    const amenity = config.amenities[i];
    chunks.push({
      chunkKey: `amenity:${i}`,
      category: "amenity",
      title: amenity.name,
      content: `${amenity.name}${amenity.hours ? ` (${amenity.hours})` : ""}: ${amenity.description}`,
    });
  }

  for (let i = 0; i < config.customFAQ.length; i++) {
    const faq = config.customFAQ[i];
    if (!faq.question.trim() && !faq.answer.trim()) continue;
    chunks.push({
      chunkKey: `faq:${i}`,
      category: "faq",
      title: faq.question.trim() || `FAQ ${i + 1}`,
      content: `When guests ask "${faq.question.trim()}", respond naturally: ${faq.answer.trim()}`,
    });
  }

  if (config.receptionistPersona?.trim()) {
    chunks.push({
      chunkKey: "persona:main",
      category: "persona",
      title: "Concierge persona",
      content: config.receptionistPersona.trim(),
    });
  }

  return chunks;
}
