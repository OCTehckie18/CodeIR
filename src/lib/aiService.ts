import axios from "axios";

const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

// A helper for direct Ollama calls
async function generateOllamaContent(prompt: string): Promise<string> {
  try {
    const res = await axios.post(
      "http://127.0.0.1:11434/api/generate",
      {
        model: "qwen2.5-coder:7b",
        prompt: prompt,
        stream: false,
      },
      {
        timeout: 120000, // 2 minutes
      }
    );

    if (!res.data || !res.data.response) {
      throw new Error("Ollama returned an empty or invalid response.");
    }
    return res.data.response;
  } catch (error: any) {
    if (error.code === "ECONNABORTED") {
      throw new Error("Ollama request timed out. The model might be slow to respond.");
    }
    const msg = error.response ? `${error.response.status} - ${JSON.stringify(error.response.data)}` : error.message;
    throw new Error(`Ollama Error: ${msg}`);
  }
}

export async function checkOllamaConnection(): Promise<boolean> {
  try {
    const res = await axios.get("http://127.0.0.1:11434/api/tags", { timeout: 3000 });
    return res.status === 200;
  } catch (error: any) {
    return false;
  }
}

export async function evaluateCode(code: string, description: string, engine: string) {
  if (engine === "ollama") {
    try {
      const correctnessPrompt = `You are an expert code reviewer. Read the following problem description and the provided code. Is the code a completely correct solution to the problem? Respond with EXACTLY the word 'CORRECT' if it is correct, or provide brief feedback on what is wrong if it is incorrect.\nProblem: ${description}\nCode:\n${code}`;
      const rawFeedback = await generateOllamaContent(correctnessPrompt);
      const feedback = rawFeedback.trim();

      if (feedback.toUpperCase().includes("CORRECT") && feedback.length < 50) {
        const irPrompt = `Generate high-level pseudocode for the following code. Output ONLY the pseudocode. Do not include any other text.\nCode:\n${code}`;
        const translatePrompt = `Translate the following code into Python, Java, and C++. Format the output clearly with markdown code blocks.\nCode:\n${code}`;
        
        const [irOutput, translatedCode] = await Promise.all([
          generateOllamaContent(irPrompt),
          generateOllamaContent(translatePrompt)
        ]);

        return { success: true, status: "valid", feedback: "CORRECT", irOutput, translatedCode };
      } else {
        return { success: true, status: "invalid", feedback };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  } else {
    // Gemini handles this via backend
    const response = await axios.post(`${baseUrl}/api/evaluate-code`, {
      code,
      description,
      engine,
    });
    return response.data;
  }
}

export async function autoGradeCode(code: string, description: string, engine: string) {
  if (engine === "ollama") {
    try {
      const prompt = `You are an expert Computer Science Instructor grading a student's code. 
Problem Description: ${description || "Unknown"}
Student Code:
${code}

Grade the code strictly on three metrics out of 10: correctness, efficiency, and style.
Provide a brief feedback string explaining the grade.
Return EXACTLY a JSON string with no markdown blocks or extra text, in this format:
{"correctness": number, "efficiency": number, "style": number, "feedback": "string"}`;
      
      const rawText = await generateOllamaContent(prompt);
      let text = rawText.trim();
      if (text.startsWith("\`\`\`json")) text = text.replace(/\`\`\`json/g, "");
      if (text.startsWith("\`\`\`")) text = text.replace(/\`\`\`/g, "");
      if (text.endsWith("\`\`\`")) text = text.replace(/\`\`\`/g, "");
      
      const parsed = JSON.parse(text.trim());
      return { success: true, data: parsed };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  } else {
    // Gemini handles this via backend
    const response = await axios.post(`${baseUrl}/api/auto-grade`, {
      code,
      description,
      engine,
    });
    return response.data;
  }
}
