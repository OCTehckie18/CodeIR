const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testModels() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const res = await model.generateContent("Say hi");
        console.log("Flash Latest works:", res.response.text());
    } catch (e) {
        console.log("Flash Latest Failed:", e.message);
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const res = await model.generateContent("Say hi");
        console.log("Pro works:", res.response.text());
    } catch (e) {
        console.log("Pro Failed:", e.message);
    }
}
testModels();
