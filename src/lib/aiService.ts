import axios from "axios";

import { apiUrl } from "./apiConfig";

// Use Vite proxy (/ollama-external) in development to avoid CORS issues
// Fallback to direct local IP for production/hosted environments (requires OLLAMA_ORIGINS)
const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const OLLAMA_URL = isLocalhost ? "/ollama-external" : "http://127.0.0.1:11434";

export async function checkOllamaConnection(): Promise<{ connected: boolean; status: "success" | "offline" | "cors_error" }> {
  try {
    // Direct call to local Ollama to ensure it works for all users (requires OLLAMA_ORIGINS="*")
    const res = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 2000 });
    return { connected: res.status === 200, status: "success" };
  } catch (error: any) {
    if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
      // Server might be there but blocking CORS
      return { connected: false, status: "cors_error" };
    }
    return { connected: false, status: "offline" };
  }
}

export async function getAvailableModels(): Promise<string[]> {
  try {
    const res = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 2000 });
    return res.data?.models?.map((m: any) => m.name) || [];
  } catch (error: any) {
    return [];
  }
}

export async function evaluateCode(code: string, description: string, engineInput: string, model?: string) {
  const engine = (engineInput || "ollama").toLowerCase().trim();
  if (engine === "ollama") {
    try {
      // Direct call for Ollama
      const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
        model: model || "qwen2.5-coder:7b",
        prompt: `You are an expert code reviewer. Read the following problem description and the provided code. Is the code a completely correct solution to the problem? Respond with EXACTLY the word 'CORRECT' if it is correct, or provide brief feedback on what is wrong if it is incorrect.\nProblem: ${description}\nCode:\n${code}`,
        stream: false
      });
      
      const feedback = response.data.response;
      if (feedback.trim().toUpperCase().includes("CORRECT") && feedback.length < 50) {
          // Perform IR and Translation locally using Ollama
          const irPrompt = `Generate high-level pseudocode for the following code. Output ONLY the pseudocode. Do not include any other text.\nCode:\n${code}`;
          const translatePrompt = `Translate the following code into Python, Java, and C++. Format the output clearly with markdown code blocks.\nCode:\n${code}`;
          
          const [irRes, transRes] = await Promise.all([
              axios.post(`${OLLAMA_URL}/api/generate`, {
                  model: model || "qwen2.5-coder:7b",
                  prompt: irPrompt,
                  stream: false
              }),
              axios.post(`${OLLAMA_URL}/api/generate`, {
                  model: model || "qwen2.5-coder:7b",
                  prompt: translatePrompt,
                  stream: false
              })
          ]);

          return { 
              success: true, 
              status: "valid", 
              feedback: "CORRECT", 
              irOutput: irRes.data.response, 
              translatedCode: transRes.data.response 
          };
      }
      return { success: true, status: "invalid", feedback };
    } catch (error: any) {
      throw error;
    }
  }

  // Gemini and Groq use proxy
  const response = await axios.post(`${apiUrl}/evaluate-code`, {
    code,
    description,
    engine,
    model,
  });
  return response.data;
}

export async function autoGradeCode(code: string, description: string, engineInput: string, model?: string) {
  const engine = (engineInput || "ollama").toLowerCase().trim();
  if (engine === "ollama") {
    try {
      // Direct call for Ollama
      const prompt = `You are an expert Computer Science Instructor grading a student's code. 
Problem Description: ${description || "Unknown"}
Student Code:
${code}

Grade the code strictly on three metrics out of 10: correctness, efficiency, and style.
Provide a brief feedback string explaining the grade.
Return EXACTLY a JSON string with no markdown blocks or extra text, in this format:
{"correctness": number, "efficiency": number, "style": number, "feedback": "string"}`;

      const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
        model: model || "qwen2.5-coder:7b",
        prompt,
        stream: false
      });
      
      let text = response.data.response.trim();
      if (text.startsWith("```json")) text = text.replace(/```json/g, "");
      if (text.startsWith("```")) text = text.replace(/```/g, "");
      if (text.endsWith("```")) text = text.slice(0, -3);
      
      return { success: true, data: JSON.parse(text) };
    } catch (error: any) {
      throw error;
    }
  }

  // Gemini and Groq use proxy
  const response = await axios.post(`${apiUrl}/auto-grade`, {
    code,
    description,
    engine,
    model,
  });
  return response.data;
}
