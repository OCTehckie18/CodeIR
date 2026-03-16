const { generateAIContent } = require('./config.js');

(async () => {
    try {
        console.log("Testing generateAIContent with 'groq'...");
        const result = await generateAIContent("groq", "Write a 1 line hello world in Python.");
        console.log("Result:", result);
    } catch (e) {
        console.error("Test failed:", e);
    }
})();
