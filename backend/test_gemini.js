const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function testGemini() {
    console.log("Testing Gemini API...");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Test current model
    try {
        console.log("Trying gemini-1.5-flash...");
        const model15 = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result15 = await model15.generateContent("Hello");
        console.log("gemini-1.5-flash success:", result15.response.text());
    } catch (error) {
        console.error("gemini-1.5-flash error:", error.message);
    }

    // Test new model
    try {
        console.log("Trying gemini-2.0-flash...");
        const model20 = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result20 = await model20.generateContent("Hello");
        console.log("gemini-2.0-flash success:", result20.response.text());
    } catch (error) {
        console.error("gemini-2.0-flash error:", error.message);
    }
}

testGemini();
