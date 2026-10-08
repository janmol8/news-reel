const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

const envLocal = fs.readFileSync(".env.local", "utf8");
const match = envLocal.match(/GEMINI_API_KEY=(.*)/);
const apiKey = match ? match[1].trim() : "";

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];
  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("test");
      console.log(`Model ${modelName} is AVAILABLE`);
      return;
    } catch (e) {
      console.log(`Model ${modelName} is NOT available: ${e.message}`);
    }
  }
}

listModels();