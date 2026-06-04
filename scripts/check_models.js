const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error("Set GOOGLE_GENERATIVE_AI_API_KEY in .env.local or the shell environment.");
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    const chatModel = process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";
    const liveModel = process.env.GEMINI_LIVE_MODEL?.trim() || "gemini-3.1-flash-live-preview";
    await genAI.getGenerativeModel({ model: chatModel }).generateContent("test");
    console.log(`REST chat/STT OK (${chatModel})`);
    console.log(`Live model configured (${liveModel}) — use /api/gemini/live-token for voice calls`);
  } catch (e) {
    console.log("Error:", e.message);
    process.exit(1);
  }
}

listModels();
