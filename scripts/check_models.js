const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
  const genAI = new GoogleGenerativeAI("AIzaSyDTajOLCq5cLPxNQ3kG3vmlSKyvpWjobYw");
  try {
    const models = await genAI.getGenerativeModel({ model: "gemini-pro" }).generateContent("test");
    console.log("Access OK");
  } catch (e) {
    if (e.message.includes("404")) {
       console.log("Model not found, trying to find alternatives...");
    }
    console.log("Error:", e.message);
  }
}

listModels();
