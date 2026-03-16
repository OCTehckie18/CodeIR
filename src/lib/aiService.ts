import axios from "axios";

const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
const OLLAMA_URL = "http://127.0.0.1:11434";

export async function checkOllamaConnection(): Promise<boolean> {
  try {
    // Direct call to local Ollama to ensure it works for all users (requires OLLAMA_ORIGINS="*")
    const res = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 2000 });
    return res.status === 200;
  } catch (error: any) {
    return false;
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

export async function evaluateCode(code: string, description: string, engine: string, model?: string) {
  if (engine === "ollama") {
    // Direct call for Ollama
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: model || "qwen2.5-coder:7b",
      prompt: `You are an expert code reviewer. Read the following problem description and the provided code. Is the code a completely correct solution to the problem? Respond with EXACTLY the word 'CORRECT' if it is correct, or provide brief feedback on what is wrong if it is incorrect.\nProblem: ${description}\nCode:\n${code}`,
      stream: false
    });
    
    const feedback = response.data.response;
    if (feedback.trim().toUpperCase().includes("CORRECT") && feedback.length < 50) {
        // If correct, we still need the IR and translation from the backend (logic is complex)
        const proxyRes = await axios.post(`${baseUrl}/api/evaluate-code`, {
            code, description, engine, model
        });
        return proxyRes.data;
    }
    return { success: true, status: "invalid", feedback };
  }

  // Gemini still uses proxy
  const response = await axios.post(`${baseUrl}/api/evaluate-code`, {
    code,
    description,
    engine,
    model,
  });
  return response.data;
}

export async function autoGradeCode(code: string, description: string, engine: string, model?: string) {
  if (engine === "ollama") {
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
  }

  // Gemini still uses proxy
  const response = await axios.post(`${baseUrl}/api/auto-grade`, {
    code,
    description,
    engine,
    model,
  });
  return response.data;
}
