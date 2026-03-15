require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const createAuthClient = (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        return createClient(supabaseUrl, supabaseKey, {
            global: {
                headers: {
                    Authorization: authHeader
                }
            }
        });
    }
    return supabase;
};

// Initialize Gemini AI Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Helper to switch engines transparently
async function generateAIContent(engine, prompt) {
    if (engine === "ollama") {
        try {
            console.log(`[Ollama] Sending request to qwen2.5-coder:7b...`);
            const res = await axios.post("http://127.0.0.1:11434/api/generate", {
                model: "qwen2.5-coder:7b",
                prompt: prompt,
                stream: false
            }, {
                timeout: 120000 // 2 minute timeout for local LLM
            });

            if (!res.data || !res.data.response) {
                console.error("[Ollama] Invalid response format:", res.data);
                throw new Error("Ollama returned an empty or invalid response.");
            }

            console.log(`[Ollama] Generation successful (${res.data.response.length} chars)`);
            return res.data.response;
        } catch (error) {
            const errorMsg = error.response ? `Status: ${error.response.status} - ${JSON.stringify(error.response.data)}` : error.message;
            console.error("Ollama Error:", errorMsg);

            if (error.code === 'ECONNABORTED') {
                throw new Error("Ollama request timed out. The 7B model might be slow on your CPU.");
            }
            throw new Error(`Ollama Error: ${errorMsg}`);
        }
    } else {
        const result = await model.generateContent(prompt);
        return result.response.text();
    }
}

module.exports = {
    supabase,
    createAuthClient,
    generateAIContent
};
