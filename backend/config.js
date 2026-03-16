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
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Helper to switch engines transparently
async function generateAIContent(engine, prompt, modelName = "qwen2.5-coder:7b") {
    const activeEngine = (engine || "ollama").toLowerCase().trim();
    console.log(`[AI Content Gen] Requested Engine: ${activeEngine}, Model: ${modelName}`);

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
                throw new Error("Ollama request timed out. The 7B model might be slow on your CPU.");
            }
            throw new Error(`Ollama Error: ${errorMsg}`);
        }
    } else if (activeEngine === "huggingface") {
        try {
            console.log(`[HuggingFace] Sending request via HF Router (OpenAI-compatible)...`);
            const hfModel = "Qwen/Qwen2.5-Coder-7B-Instruct";
            const response = await axios.post(
                "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-Coder-7B-Instruct/v1/chat/completions",
                {
                    model: hfModel,
                    messages: [
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    max_tokens: 1500,
                    temperature: 0.3,
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.HF_TOKEN || process.env.HF_KEY}`,
                        "Content-Type": "application/json",
                    },
                    timeout: 90000,
                }
            );

            const result = response.data?.choices?.[0]?.message?.content;

            if (!result) {
                console.error("[HuggingFace] Empty response:", JSON.stringify(response.data));
                throw new Error("Hugging Face returned an empty response.");
            }

            console.log(`[HuggingFace] Generation successful (${result.length} chars)`);
            return result;
        } catch (error) {
            const errorMsg = error.response
                ? `Status: ${error.response.status} - ${JSON.stringify(error.response.data)}`
                : error.message;
            console.error("Hugging Face Error:", errorMsg);
            throw new Error(`Hugging Face Error: ${errorMsg}`);
        }
    } else if (activeEngine === "gemini") {
        console.log(`[Gemini] Sending request to gemini-2.0-flash...`);
        const result = await geminiModel.generateContent(prompt);
        return result.response.text();
    } else {
        console.warn(`[AI Content Gen] Unknown engine "${activeEngine}", falling back to Ollama.`);
        return await generateAIContent("ollama", prompt, modelName);
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
