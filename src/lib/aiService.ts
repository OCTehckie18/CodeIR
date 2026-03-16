import axios from "axios";

const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

export async function checkOllamaConnection(): Promise<boolean> {
  try {
    const res = await axios.get(`${baseUrl}/api/ai/status`, { timeout: 3000 });
    return res.data?.connected || false;
  } catch (error: any) {
    return false;
  }
}

export async function evaluateCode(code: string, description: string, engine: string) {
  // All engines (Ollama/Gemini) are now handled via backend to avoid CORS issues
  const response = await axios.post(`${baseUrl}/api/evaluate-code`, {
    code,
    description,
    engine,
  });
  return response.data;
}

export async function autoGradeCode(code: string, description: string, engine: string) {
  // All engines (Ollama/Gemini) are now handled via backend to avoid CORS issues
  const response = await axios.post(`${baseUrl}/api/auto-grade`, {
    code,
    description,
    engine,
  });
  return response.data;
}
