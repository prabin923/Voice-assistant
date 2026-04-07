import { GoogleGenerativeAI } from "@google/generative-ai";
import { getHotelConfig } from './hotelConfig';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-lite" });

export async function getAssistantResponse(message: string, language: string) {
  const config = getHotelConfig();
  const langCode = language || config.language || 'en-US';

  const systemPrompt = `
    You are the AI Receptionist for ${config.branding.hotelName}. 
    Your Persona: ${config.receptionistPersona}.
    Hotel Policies: ${config.policies}.
    Amenities: ${config.amenities.map(a => a.name).join(', ')}.
    Language: Respond strictly in the language requested (${langCode}).
    Tone: Professional, helpful, and hospitable.
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
