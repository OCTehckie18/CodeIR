require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase Admin Client
// Using the Service Role Key here lets the backend bypass Row Level Security rules
// Make sure to replace SUPABASE_SERVICE_ROLE_KEY in .env with the actual secret from your dashboard
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

const axios = require("axios");

// Basic health check route
app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", message: "CodeIR Express Backend is running!" });
});

// ─────────────────────────────────────────────────────────────────
// PROFILE CRUD ENDPOINTS
// These use Supabase's Admin Auth API to read/write user_metadata
// stored directly on the auth.users record — no extra table needed.
// ─────────────────────────────────────────────────────────────────

// GET /api/profiles/:userId  —  Read profile (display_name, bio, theme, avatar_url, joined date)
app.get("/api/profiles/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
        const { data, error } = await supabase.auth.admin.getUserById(userId);
        if (error) throw error;

        const meta = data.user.user_metadata || {};
        res.status(200).json({
            success: true,
            profile: {
                userId: data.user.id,
                email: data.user.email,
                display_name: meta.display_name || data.user.email?.split("@")[0] || "Student",
                bio: meta.bio || "",
                avatar_url: meta.avatar_url || null,
                theme_preference: meta.theme_preference || "dark",
                role: meta.role || "student",
                joined_at: data.user.created_at,
            }
        });
    } catch (error) {
        console.error("Profile GET Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/profiles/:userId  —  Update profile metadata
app.put("/api/profiles/:userId", async (req, res) => {
    const { userId } = req.params;
    const { display_name, bio, theme_preference, avatar_url } = req.body;

    try {
        // Read existing metadata first so we don't overwrite unrelated fields
        const { data: existing, error: fetchError } = await supabase.auth.admin.getUserById(userId);
        if (fetchError) throw fetchError;

        const currentMeta = existing.user.user_metadata || {};

        const updatedMeta = {
            ...currentMeta,
            ...(display_name !== undefined && { display_name }),
            ...(bio !== undefined && { bio }),
            ...(theme_preference !== undefined && { theme_preference }),
            ...(avatar_url !== undefined && { avatar_url }),
        };

        const { data, error } = await supabase.auth.admin.updateUserById(userId, {
            user_metadata: updatedMeta,
        });

        if (error) throw error;

        console.log(`Profile updated for user ${userId}`);
        res.status(200).json({
            success: true,
            message: "Profile updated successfully.",
            profile: {
                display_name: updatedMeta.display_name,
                bio: updatedMeta.bio,
                theme_preference: updatedMeta.theme_preference,
                avatar_url: updatedMeta.avatar_url,
            }
        });
    } catch (error) {
        console.error("Profile PUT Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/profiles/:userId  —  Delete account and cascade all submissions
app.delete("/api/profiles/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        console.log(`Deleting account for user ${userId}...`);

        // Step 1: Delete all submissions (cascade will handle pseudocodes/translations/evaluations)
        const { error: subDeleteError } = await supabase
            .from("submissions")
            .delete()
            .eq("user_id", userId);

        if (subDeleteError) {
            console.warn("Could not delete submissions:", subDeleteError.message);
            // Continue anyway — the auth user deletion should still work
        }

        // Step 2: Delete the auth user (this removes them from auth.users entirely)
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
        if (authDeleteError) throw authDeleteError;

        console.log(`Account for user ${userId} deleted.`);
        res.status(200).json({ success: true, message: "Account deleted successfully." });
    } catch (error) {
        console.error("Account Delete Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Initialize Gemini AI Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Helper to switch engines transparently
async function generateAIContent(engine, prompt) {
    if (engine === "ollama") {
        try {
            const res = await axios.post("http://localhost:11434/api/generate", {
                model: "gpt-oss:latest", // Match exact local model name available
                prompt: prompt,
                stream: false
            });
            return res.data.response;
        } catch (error) {
            console.error("Ollama Error:", error.message);
            throw new Error("Failed to connect to local Ollama engine. Is it running?");
        }
    } else {
        const result = await model.generateContent(prompt);
        return result.response.text();
    }
}

// --- PROBLEM BANK ENDPOINTS ---

app.post("/api/problems", async (req, res) => {
    try {
        const { title, problem_statement, boilerplate_code, difficulty_level } = req.body;
        const { data, error } = await supabase
            .from("problems")
            .insert({ title, problem_statement, boilerplate_code, difficulty_level })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get("/api/problems", async (req, res) => {
    try {
        const { data, error } = await supabase.from("problems").select("*").order("problem_id", { ascending: false });
        if (error) throw error;
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get("/api/problems/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase.from("problems").select("*").eq("problem_id", id).single();
        if (error) throw error;
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put("/api/problems/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { title, problem_statement, boilerplate_code, difficulty_level } = req.body;
        const { data, error } = await supabase
            .from("problems")
            .update({ title, problem_statement, boilerplate_code, difficulty_level })
            .eq("problem_id", id)
            .select()
            .single();

        if (error) throw error;
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete("/api/problems/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from("problems").delete().eq("problem_id", id);
        if (error) throw error;
        res.status(200).json({ success: true, message: "Problem deleted" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 1. EVALUATION AND CODE VALIDATION ENDPOINT
app.post("/api/evaluate-code", async (req, res) => {
    const { code, description, engine = "ollama" } = req.body;

    if (!code || !description) {
        return res.status(400).json({ success: false, error: "Code and description are required." });
    }

    try {
        console.log(`Validating correctness with ${engine.toUpperCase()}...`);

        // Step 1: Check Correctness
        const correctnessPrompt = `You are an expert code reviewer. Read the following problem description and the provided code. Is the code a completely correct solution to the problem? Respond with EXACTLY the word 'CORRECT' if it is correct, or provide brief feedback on what is wrong if it is incorrect.\nProblem: ${description}\nCode:\n${code}`;
        const rawFeedback = await generateAIContent(engine, correctnessPrompt);
        const feedback = rawFeedback.trim();

        if (feedback.toUpperCase().includes("CORRECT") && feedback.length < 50) {
            console.log("Code is CORRECT! Generating IR and translations...");

            // Step 2: Generate IR and Translations in parallel
            const irPrompt = `Generate high-level pseudocode for the following code. Output ONLY the pseudocode. Do not include any other text.\nCode:\n${code}`;
            const translatePrompt = `Translate the following code into Python, Java, and C++. Format the output clearly with markdown code blocks.\nCode:\n${code}`;

            const [irOutput, translatedCode] = await Promise.all([
                generateAIContent(engine, irPrompt),
                generateAIContent(engine, translatePrompt)
            ]);

            return res.status(200).json({
                success: true,
                status: "valid",
                feedback: "CORRECT",
                irOutput: irOutput,
                translatedCode: translatedCode
            });
        } else {
            console.log("Validation Failed:", feedback);
            return res.status(200).json({
                success: true,
                status: "invalid",
                feedback
            });
        }

    } catch (error) {
        console.error("Evaluation Error:", error.message);
        return res.status(500).json({ success: false, error: error.message, details: error.message });
    }
});

// 2. DATABASE SUBMISSION ENDPOINT (Relational Inserts)
app.post("/api/submissions", async (req, res) => {
    const { userId, description, code, language, irOutput, translatedCode, validationStatus, problemId } = req.body;

    if (!userId || !description || !code) {
        return res.status(400).json({ success: false, error: "Missing required fields for submission." });
    }

    try {
        console.log(`Handling database inserts (status: ${validationStatus || "pending"})...`);
        const authSupabase = createAuthClient(req);

        // 1. Resolve problem_id:
        //    - If student selected a problem from the Problem Bank, use that ID directly.
        //    - If they typed a custom description in Sandbox mode, create a new problem row.
        //    NOTE: We use the ADMIN supabase client here because `problems` is instructor-managed
        //    and student JWTs are blocked from inserting by RLS. This is safe—the backend is the
        //    trusted server; we're just creating a placeholder problem row for the FK constraint.
        let resolvedProblemId = problemId || null;

        if (!resolvedProblemId) {
            const { data: newProblem, error: problemError } = await supabase  // admin client — bypasses RLS
                .from("problems")
                .insert({ problem_statement: description })
                .select()
                .single();

            if (problemError) throw problemError;
            resolvedProblemId = newProblem.problem_id;
        }

        // 2. Insert Submission — use auth client so RLS validates user_id ownership
        const { data: sub, error: subError } = await authSupabase
            .from("submissions")
            .insert({
                user_id: userId,
                problem_id: resolvedProblemId,
                source_code: code,
                source_language: language,
                validation_status: validationStatus || "pending",
            })
            .select()
            .single();

        if (subError) throw subError;

        // 3 & 4: Only insert Pseudocode + Translations for fully validated submissions.
        // Drafts skip this entirely — they have no real IR/translation data yet.
        if (validationStatus !== "draft") {
            const { data: pseudo, error: pseudoError } = await authSupabase
                .from("pseudocodes")
                .insert({
                    submission_id: sub.submission_id,
                    structured_blocks: JSON.stringify({ ir: irOutput }),
                })
                .select()
                .single();

            if (pseudoError) throw pseudoError;

            const { error: transError } = await authSupabase
                .from("translations")
                .insert({
                    pseudocode_id: pseudo.pseudocode_id,
                    target_language: "multiple",
                    translated_code: translatedCode,
                });

            if (transError) throw transError;
        }
        console.log("Submission saved successfully!");
        return res.status(201).json({ success: true, message: "Submission successfully securely saved!", submissionId: sub.submission_id });

    } catch (error) {
        console.error("Database Insert Error:", error.message);
        return res.status(500).json({ success: false, error: "Database transaction failed.", details: error.message });
    }
});

// 2b. SAVE DRAFT ENDPOINT (UPDATE submission in place - no pseudocode/IR required)
// PUT /api/submissions/:id   — Students can update code + description without validation
app.put("/api/submissions/:id", async (req, res) => {
    const { id } = req.params;
    const { code, description, language } = req.body;

    if (!code) {
        return res.status(400).json({ success: false, error: "Code is required to save a draft." });
    }

    try {
        console.log(`Saving draft for submission ${id}...`);
        const authSupabase = createAuthClient(req);

        // Update the source code and mark it as a draft (pending status)
        const { data: updatedSub, error: subError } = await authSupabase
            .from("submissions")
            .update({
                source_code: code,
                source_language: language || "javascript",
                validation_status: "draft",
            })
            .eq("submission_id", id)
            .select()
            .single();

        if (subError) throw subError;
        if (!updatedSub) {
            return res.status(404).json({ success: false, error: "Submission not found or access denied." });
        }

        // If a new description is provided, also update the linked problem statement
        if (description && updatedSub.problem_id) {
            const { error: problemError } = await authSupabase
                .from("problems")
                .update({ problem_statement: description })
                .eq("problem_id", updatedSub.problem_id);

            if (problemError) console.warn("Could not update problem statement:", problemError.message);
        }

        console.log("Draft saved successfully!");
        return res.status(200).json({ success: true, message: "Draft saved successfully!", submissionId: updatedSub.submission_id });

    } catch (error) {
        console.error("Draft Save Error:", error.message);
        return res.status(500).json({ success: false, error: "Failed to save draft.", details: error.message });
    }
});

// 2c. DELETE SUBMISSION ENDPOINT
// DELETE /api/submissions/:id   — Students can delete their own submissions
app.delete("/api/submissions/:id", async (req, res) => {
    const { id } = req.params;

    try {
        console.log(`Deleting submission ${id}...`);
        const authSupabase = createAuthClient(req);

        // Supabase Row Level Security on the 'submissions' table will ensure only
        // the owner (user_id = auth.uid()) can delete their own submissions.
        // The cascade delete in the DB will automatically remove related
        // pseudocodes, translations, and evaluations.
        const { error } = await authSupabase
            .from("submissions")
            .delete()
            .eq("submission_id", id);

        if (error) throw error;

        console.log(`Submission ${id} deleted.`);
        return res.status(200).json({ success: true, message: "Submission deleted successfully." });

    } catch (error) {
        console.error("Delete Error:", error.message);
        return res.status(500).json({ success: false, error: "Failed to delete submission.", details: error.message });
    }
});

app.get("/api/dashboard/:userId", async (req, res) => {
    try {
        const authSupabase = createAuthClient(req);
        const { userId } = req.params;
        const { data, error } = await authSupabase
            .from("submissions")
            .select(`
                submission_id, submission_timestamp, validation_status, source_code,
                problems ( problem_statement ),
                pseudocodes ( structured_blocks, translations ( target_language, translated_code ) ),
                evaluations ( teacher_feedback, final_scores )
            `)
            .eq("user_id", userId)
            .order("submission_timestamp", { ascending: false });

        if (error) throw error;

        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─────────────────────────────────────────────────────────────────
// REVIEW COMMENTS CRUD  (Granular Code Review)
// ─────────────────────────────────────────────────────────────────

// CREATE — POST /api/review-comments
app.post("/api/review-comments", async (req, res) => {
    const { submission_id, instructor_id, line_number, comment_text, comment_type } = req.body;
    if (!submission_id || !instructor_id || !comment_text) {
        return res.status(400).json({ success: false, error: "submission_id, instructor_id, and comment_text are required." });
    }
    try {
        const { data, error } = await supabase
            .from("review_comments")
            .insert({ submission_id, instructor_id, line_number: line_number ?? 0, comment_text, comment_type: comment_type || "general" })
            .select().single();
        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error) {
        console.error("Review Comment POST Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// READ — GET /api/review-comments/:submissionId
app.get("/api/review-comments/:submissionId", async (req, res) => {
    const { submissionId } = req.params;
    try {
        const { data, error } = await supabase
            .from("review_comments")
            .select("*")
            .eq("submission_id", submissionId)
            .order("line_number", { ascending: true })
            .order("created_at", { ascending: true });
        if (error) throw error;
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Review Comment GET Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// UPDATE — PUT /api/review-comments/:commentId
app.put("/api/review-comments/:commentId", async (req, res) => {
    const { commentId } = req.params;
    const { comment_text, comment_type, line_number } = req.body;
    if (!comment_text) return res.status(400).json({ success: false, error: "comment_text is required." });
    try {
        const { data, error } = await supabase
            .from("review_comments")
            .update({ comment_text, ...(comment_type !== undefined && { comment_type }), ...(line_number !== undefined && { line_number }) })
            .eq("comment_id", commentId)
            .select().single();
        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, error: "Comment not found." });
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Review Comment PUT Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE — DELETE /api/review-comments/:commentId
app.delete("/api/review-comments/:commentId", async (req, res) => {
    const { commentId } = req.params;
    try {
        const { error } = await supabase.from("review_comments").delete().eq("comment_id", commentId);
        if (error) throw error;
        res.status(200).json({ success: true, message: "Comment deleted." });
    } catch (error) {
        console.error("Review Comment DELETE Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. INSTRUCTOR DASHBOARD API
app.get("/api/instructor/dashboard", async (req, res) => {
    try {
        // Use Global Admin Client to bypass Student-only RLS
        const adminSupabase = supabase;
        const { data, error } = await adminSupabase
            .from("submissions")
            .select(`
                submission_id, submission_timestamp, validation_status, source_code, user_id,
                problems ( problem_statement ),
                evaluations ( evaluation_id, final_scores )
            `)
            .order("submission_timestamp", { ascending: false });

        if (error) throw error;

        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 5. FETCH SPECIFIC SUBMISSION FOR EVALUATION
app.get("/api/submissions/:submissionId", async (req, res) => {
    try {
        // Use Global Admin Client to bypass Student-only RLS
        const adminSupabase = supabase;
        const { submissionId } = req.params;
        const { data, error } = await adminSupabase
            .from("submissions")
            .select("*, pseudocodes ( structured_blocks ), evaluations ( final_scores, teacher_feedback )")
            .eq("submission_id", submissionId)
            .single();

        if (error) throw error;

        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 6. UPSERT EVALUATION API
app.post("/api/evaluations", async (req, res) => {
    try {
        // Use Global Admin Client to bypass Student-only RLS
        const adminSupabase = supabase;
        const { submissionId, instructorId, scores, feedback } = req.body;

        if (!submissionId || !instructorId) {
            return res.status(400).json({ success: false, error: "Missing submission ID or instructor ID." });
        }

        const { error } = await adminSupabase.from("evaluations").upsert(
            {
                submission_id: submissionId,
                instructor_id: instructorId,
                final_scores: scores,
                teacher_feedback: feedback,
            },
            { onConflict: "submission_id" }
        );

        if (error) throw error;

        res.status(200).json({ success: true, message: "Evaluation saved successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 7. AUTO GRADE API
app.post("/api/auto-grade", async (req, res) => {
    try {
        const { code, description, engine = "ollama" } = req.body;

        if (!code) {
            return res.status(400).json({ success: false, error: "Code is required for auto-grading." });
        }

        console.log(`Auto-grading with ${engine.toUpperCase()}...`);
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
        // Strip markdown backticks if AI adds them
        if (text.startsWith("\`\`\`json")) text = text.replace(/\`\`\`json/g, "");
        if (text.startsWith("\`\`\`")) text = text.replace(/\`\`\`/g, "");
        if (text.endsWith("\`\`\`")) text = text.replace(/\`\`\`/g, "");

        const parsed = JSON.parse(text.trim());

        res.status(200).json({ success: true, data: parsed });
    } catch (error) {
        console.error("Auto Grade Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend Server running on http://localhost:${PORT}`);
});
