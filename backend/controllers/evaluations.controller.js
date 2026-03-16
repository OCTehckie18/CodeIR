const { supabase, createAuthClient, generateAIContent, checkOllamaStatus } = require("../config");

exports.evaluateCode = async (req, res) => {
    const { code, description, engine = "ollama" } = req.body;
    if (!code || !description) return res.status(400).json({ success: false, error: "Code and description are required." });
    try {
        const correctnessPrompt = `You are an expert code reviewer. Read the following problem description and the provided code. Is the code a completely correct solution to the problem? Respond with EXACTLY the word 'CORRECT' if it is correct, or provide brief feedback on what is wrong if it is incorrect.\nProblem: ${description}\nCode:\n${code}`;
        const rawFeedback = await generateAIContent(engine, correctnessPrompt);
        const feedback = rawFeedback.trim();

        if (feedback.toUpperCase().includes("CORRECT") && feedback.length < 50) {
            const irPrompt = `Generate high-level pseudocode for the following code. Output ONLY the pseudocode. Do not include any other text.\nCode:\n${code}`;
            const translatePrompt = `Translate the following code into Python, Java, and C++. Format the output clearly with markdown code blocks.\nCode:\n${code}`;
            const [irOutput, translatedCode] = await Promise.all([
                generateAIContent(engine, irPrompt),
                generateAIContent(engine, translatePrompt)
            ]);
            res.status(200).json({ success: true, status: "valid", feedback: "CORRECT", irOutput, translatedCode });
        } else {
            res.status(200).json({ success: true, status: "invalid", feedback });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.upsertEvaluation = async (req, res) => {
    try {
        const { submissionId, instructorId, scores, feedback } = req.body;
        if (!submissionId || !instructorId) return res.status(400).json({ success: false, error: "Missing submission ID or instructor ID." });
        const authSupabase = createAuthClient(req);
        const { error } = await authSupabase.from("evaluations").upsert({
            submission_id: submissionId,
            instructor_id: instructorId,
            final_scores: scores,
            teacher_feedback: feedback,
        }, { onConflict: "submission_id" });
        if (error) throw error;
        res.status(200).json({ success: true, message: "Evaluation saved successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.autoGrade = async (req, res) => {
    try {
        const { code, description, engine = "ollama" } = req.body;
        if (!code) return res.status(400).json({ success: false, error: "Code is required for auto-grading." });
        const prompt = `You are an expert Computer Science Instructor grading a student's code. 
Problem Description: ${description || "Unknown"}
Student Code:
${code}

Grade the code strictly on three metrics out of 10: correctness, efficiency, and style.
Provide a brief feedback string explaining the grade.
Return EXACTLY a JSON string with no markdown blocks or extra text, in this format:
{"correctness": number, "efficiency": number, "style": number, "feedback": "string"}`;
        const rawText = await generateAIContent(engine, prompt);
        let text = rawText.trim();
        if (text.startsWith("```json")) text = text.replace(/```json/g, "");
        if (text.startsWith("```")) text = text.replace(/```/g, "");
        if (text.endsWith("```")) text = text.replace(/```/g, "");
        const parsed = JSON.parse(text.trim());
        res.status(200).json({ success: true, data: parsed });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// --- REVIEW COMMENTS ---
exports.createReviewComment = async (req, res) => {
    const { submission_id, instructor_id, line_number, comment_text, comment_type } = req.body;
    if (!submission_id || !instructor_id || !comment_text) return res.status(400).json({ success: false, error: "submission_id, instructor_id, and comment_text are required." });
    try {
        const authSupabase = createAuthClient(req);
        const { data, error } = await authSupabase.from("review_comments").insert({
            submission_id, instructor_id, line_number: line_number ?? 0, comment_text, comment_type: comment_type || "general"
        }).select().single();
        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getReviewComments = async (req, res) => {
    const { submissionId } = req.params;
    try {
        const authSupabase = createAuthClient(req);
        const { data, error } = await authSupabase.from("review_comments").select("*").eq("submission_id", submissionId)
            .order("line_number", { ascending: true }).order("created_at", { ascending: true });
        if (error) throw error;
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateReviewComment = async (req, res) => {
    const { commentId } = req.params;
    const { comment_text, comment_type, line_number } = req.body;
    if (!comment_text) return res.status(400).json({ success: false, error: "comment_text is required." });
    try {
        const authSupabase = createAuthClient(req);
        const { data, error } = await authSupabase.from("review_comments").update({
            comment_text, ...(comment_type !== undefined && { comment_type }), ...(line_number !== undefined && { line_number })
        }).eq("comment_id", commentId).select().single();
        if (error) throw error;
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteReviewComment = async (req, res) => {
    const { commentId } = req.params;
    try {
        const authSupabase = createAuthClient(req);
        const { error } = await authSupabase.from("review_comments").delete().eq("comment_id", commentId);
        if (error) throw error;
        res.status(200).json({ success: true, message: "Comment deleted." });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.checkAIStatus = async (req, res) => {
    try {
        // Disable caching to ensure fresh status every time (prevents 304 Not Modified)
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        const isConnected = await checkOllamaStatus();
        res.status(200).json({ success: true, connected: isConnected });
    } catch (error) {
        res.status(200).json({ success: true, connected: false });
    }
};
