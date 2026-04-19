import { GoogleGenerativeAI } from "@google/generative-ai";
import { getHotelConfig } from "./hotelConfig";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

function buildSystemInstruction(): string {
  const config = getHotelConfig();

  return `You are the Senior AI Receptionist at ${config.branding.hotelName}.

PERSONA:
${config.receptionistPersona}
You are hospitable, professional, and helpful. You do NOT make up your own questions. You ONLY answer the guest's question.

CRITICAL RULES:
- NEVER invent or fabricate questions on behalf of the guest.
- NEVER repeat the guest's question back to them as if you asked it.
- Read the guest's message carefully and respond DIRECTLY to what they said.
- If the message is a greeting like "hello" or "hi", greet them back warmly and ask how you can help.

HOTEL DATA:
- Hotel Name: ${config.branding.hotelName}
- Phone: ${config.contact.phone}
- Email: ${config.contact.email}
- Address: ${config.contact.address}
- Check-in: ${config.policies.checkInTime}
- Check-out: ${config.policies.checkOutTime}
- Cancellation: ${config.policies.cancellationPolicy}
- Amenities: ${config.amenities.map(a => `${a.name} (${a.description})`).join(", ")}
- Room Types: ${config.rooms.map(r => `${r.name}: ${r.currency}${r.pricePerNight}/night, max ${r.maxOccupancy} guests`).join("; ")}

RESPONSE RULES:
1. Respond strictly in the language matching this code: the language the guest uses.
2. Keep responses concise and warm — this is a voice interaction.
3. If the guest asks about something NOT in the hotel data, OR makes a complaint, OR needs human action (booking changes, billing, emergencies), add [ESCALATE] at the very end of your response.
4. If the guest asks to speak to a human/staff/manager, add [ESCALATE] at the end.
5. Do NOT add [ESCALATE] for normal informational questions you can answer.
6. Give fresh, natural replies. Do not just list facts unless the guest specifically asks for a list.`;
}

export async function getAssistantResponse(message: string, language: string): Promise<{ reply: string; escalate: boolean }> {
  const config = getHotelConfig();
  const langCode = language || config.language || "en-US";

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      systemInstruction: buildSystemInstruction(),
      generationConfig: {
        maxOutputTokens: 400,
        temperature: 0.5,
      },
    });

    const result = await model.generateContent(
      `[Guest speaks in ${langCode}]: ${message}`
    );
    const response = result.response;
    const text = response.text().trim();

    const escalate = text.includes("[ESCALATE]");
    const cleanText = text.replace(/\[ESCALATE\]/g, "").trim();

    return { reply: cleanText, escalate };
  } catch (error) {
    console.error("Response Engine Error:", error);
    return {
      reply: "I apologize, but I am having trouble right now. Please try again in a moment.",
      escalate: false,
    };
  }
}
