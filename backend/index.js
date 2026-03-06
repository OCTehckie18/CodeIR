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

// Initialize Gemini AI Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// 1. EVALUATION AND CODE VALIDATION ENDPOINT
app.post("/api/evaluate-code", async (req, res) => {
    const { code, description } = req.body;

    if (!code || !description) {
        return res.status(400).json({ success: false, error: "Code and description are required." });
    }

    try {
        console.log("Validating correctness with Gemini...");

        // Step 1: Check Correctness
        const correctnessPrompt = `You are an expert code reviewer. Read the following problem description and the provided code. Is the code a completely correct solution to the problem? Respond with EXACTLY the word 'CORRECT' if it is correct, or provide brief feedback on what is wrong if it is incorrect.\nProblem: ${description}\nCode:\n${code}`;
        const resultCorrectness = await model.generateContent(correctnessPrompt);
        const feedback = resultCorrectness.response.text().trim();

        if (feedback.toUpperCase().includes("CORRECT") && feedback.length < 50) {
            console.log("Code is CORRECT! Generating IR and translations...");

            // Step 2: Generate IR and Translations in parallel
            const irPrompt = `Generate high-level pseudocode for the following code. Output ONLY the pseudocode. Do not include any other text.\nCode:\n${code}`;
            const translatePrompt = `Translate the following code into Python, Java, and C++. Format the output clearly with markdown code blocks.\nCode:\n${code}`;

            const [resIR, resTranslate] = await Promise.all([
                model.generateContent(irPrompt),
                model.generateContent(translatePrompt)
            ]);

            const irOutput = resIR.response.text();
            const translatedCode = resTranslate.response.text();

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
        return res.status(500).json({ success: false, error: "Failed to connect to Gemini evaluating engine.", details: error.message });
    }
});

// 2. DATABASE SUBMISSION ENDPOINT (Relational Inserts)
app.post("/api/submissions", async (req, res) => {
    const { userId, description, code, language, irOutput, translatedCode, validationStatus } = req.body;

    if (!userId || !description || !code) {
        return res.status(400).json({ success: false, error: "Missing required fields for submission." });
    }

    try {
        console.log("Handling database inserts...");
        const authSupabase = createAuthClient(req);

        // 1. Insert Problem dynamically
        const { data: newProblem, error: problemError } = await authSupabase
            .from("problems")
            .insert({ problem_statement: description })
            .select()
            .single();

        if (problemError) throw problemError;

        // 2. Insert Submission
        const { data: sub, error: subError } = await authSupabase
            .from("submissions")
            .insert({
                user_id: userId,
                problem_id: newProblem.problem_id,
                source_code: code,
                source_language: language,
                validation_status: validationStatus || "pending",
            })
            .select()
            .single();

        if (subError) throw subError;

        // 3. Insert Pseudocode
        const { data: pseudo, error: pseudoError } = await authSupabase
            .from("pseudocodes")
            .insert({
                submission_id: sub.submission_id,
                structured_blocks: JSON.stringify({ ir: irOutput }),
            })
            .select()
            .single();

        if (pseudoError) throw pseudoError;

        // 4. Insert Translations
        const { error: transError } = await authSupabase
            .from("translations")
            .insert({
                pseudocode_id: pseudo.pseudocode_id,
                target_language: "multiple",
                translated_code: translatedCode,
            });

        if (transError) throw transError;
        console.log("Submission saved successfully!");
        return res.status(201).json({ success: true, message: "Submission successfully securely saved!" });

    } catch (error) {
        console.error("Database Insert Error:", error.message);
        return res.status(500).json({ success: false, error: "Database transaction failed.", details: error.message });
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

// 4. INSTRUCTOR DASHBOARD API
app.get("/api/instructor/dashboard", async (req, res) => {
    try {
        const authSupabase = createAuthClient(req);
        const { data, error } = await authSupabase
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
        const authSupabase = createAuthClient(req);
        const { submissionId } = req.params;
        const { data, error } = await authSupabase
            .from("submissions")
            .select("*, pseudocodes ( structured_blocks )")
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
        const authSupabase = createAuthClient(req);
        const { submissionId, scores, feedback } = req.body;

        if (!submissionId) {
            return res.status(400).json({ success: false, error: "Missing submission ID." });
        }

        const { error } = await authSupabase.from("evaluations").upsert(
            {
                submission_id: submissionId,
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend Server running on http://localhost:${PORT}`);
});
