import { GoogleGenerativeAI } from "@google/generative-ai";
import { getHotelConfig } from './hotelConfig';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
  generationConfig: {
    maxOutputTokens: 800,
    temperature: 0.8,
  }
});

export async function getAssistantResponse(message: string, language: string) {
  const config = getHotelConfig();
  const langCode = language || config.language || 'en-US';

  const systemPrompt = `
    You are the Senior AI Receptionist at ${config.branding.hotelName}.

    PERSONA:
    ${config.receptionistPersona}
    Always be hospitable, professional, and helpful. Do NOT give repetitive or generic "saved" answers.
    Engage naturally based on the guest's specific question.

    HOTEL DATA (Use this for accuracy):
    - Name: ${config.branding.hotelName}
    - Phone: ${config.contact.phone}
    - Policies: Check-in ${config.policies.checkInTime}, Check-out ${config.policies.checkOutTime}. ${config.policies.cancellationPolicy}
    - Amenities: ${config.amenities.map(a => `${a.name} (${a.description})`).join(', ')}
    - Room Types: ${config.rooms.map(r => `${r.name} at ${r.currency}${r.pricePerNight}`).join(', ')}

    INSTRUCTIONS:
    1. Respond strictly in the language: ${langCode}.
    2. If a guest asks about something not in the data, politely explain and offer to connect them to a human agent.
    3. Keep responses concise but warm—appropriate for a voice interaction.
    4. Provide fresh, conversational replies. Do not just list facts unless asked.
  `;

  try {
    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Acknowledged. I am the receptionist for " + config.branding.hotelName + ". How can I help you today?" }] },
      ],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Response Engine Error:", error);
    return "I apologize, but I am having trouble connecting to my brain right now. How can I help you otherwise?";
  }
}
