import OpenAI from 'openai';
import { getHotelConfig } from './hotelConfig';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

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
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content?.trim() || "I apologize, could you please repeat that?";
  } catch (error) {
    console.error("Response Engine Error:", error);
    return "I apologize, but I am having trouble connecting right now. How can I help you otherwise?";
  }
}
