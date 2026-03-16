require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk");

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
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Initialize Groq Client
const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
const GROQ_MODEL = "llama-3.3-70b-versatile";

const axios = require("axios");

// Helper to switch engines transparently
async function generateAIContent(engine, prompt, modelName = "qwen2.5-coder:7b") {
    const rawEngine = (engine || "ollama").toString().toLowerCase().trim();
    // Normalize: remove spaces, dashes, underscores to handle "Hugging Face", "hugging-face", etc.
    const activeEngine = rawEngine.replace(/[\s-_]+/g, "");
    
    console.log(`[AI Content Gen] === REQUEST START ===`);
    console.log(`[AI Content Gen] Engine string received: "${engine}"`);
    console.log(`[AI Content Gen] Normalized Engine: "${activeEngine}" (raw: "${rawEngine}"), Model: "${modelName}"`);

    if (activeEngine === "ollama") {
        try {
            console.log(`[Ollama] Sending request to ${modelName}...`);
            const res = await axios.post("http://127.0.0.1:11434/api/generate", {
                model: modelName,
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
                throw new Error(`Ollama request timed out (7B model on CPU).`);
            }
            throw new Error(`Backend Error (Ollama Path): ${errorMsg}`);
        }
    } else if (activeEngine === "groq" || activeEngine === "huggingface") {
        try {
            console.log(`[Groq/HF] Sending request to ${GROQ_MODEL}...`);
            const chatCompletion = await groqClient.chat.completions.create({
                model: GROQ_MODEL,
                messages: [{ role: "user", content: prompt }],
                max_tokens: 1500,
                temperature: 0.3,
            });

            const result = chatCompletion.choices?.[0]?.message?.content;
            if (!result) {
                console.error("[Groq] Empty response:", JSON.stringify(chatCompletion));
                throw new Error("Groq returned an empty response.");
            }

            console.log(`[Groq] Generation successful (${result.length} chars)`);
            return result;
        } catch (error) {
            const errorMsg = error.error
                ? `Status: ${error.status} - ${JSON.stringify(error.error)}`
                : error.message;
            console.error("Groq Error:", errorMsg);
            throw new Error(`Groq Error: ${errorMsg}`);
        }
    } else if (activeEngine === "gemini") {
        console.log(`[Gemini] Sending request to gemini-2.0-flash...`);
        const result = await geminiModel.generateContent(prompt);
        return result.response.text();
    } else {
        const msg = `Unknown engine "${activeEngine}" (original: "${engine}"). Supported: ollama, groq, gemini.`;
        console.warn(`[AI Content Gen] ${msg}`);
        throw new Error(msg);
    }
}

async function checkOllamaStatus() {
    try {
        const res = await axios.get("http://127.0.0.1:11434/api/tags", { timeout: 3000 });
        return res.status === 200;
    } catch (error) {
        return false;
    }
}

async function getOllamaModels() {
    try {
        const res = await axios.get("http://127.0.0.1:11434/api/tags", { timeout: 3000 });
        if (res.data && res.data.models) {
            return res.data.models.map(m => m.name);
        }
        return [];
    } catch (error) {
        return [];
    }
}

module.exports = {
    supabase,
    createAuthClient,
    generateAIContent,
    checkOllamaStatus,
    getOllamaModels
};
