const { supabase } = require("../config");

/**
 * GET /api/public/stats
 * Returns aggregate platform stats for the landing page.
 * No authentication required — data is non-sensitive counts.
 */
exports.getPublicStats = async (req, res) => {
    try {
        // Run all queries in parallel for speed
        const [
            submissionsResult,
            evaluationsResult,
            problemsResult,
            usersResult,
        ] = await Promise.allSettled([
            supabase.from("submissions").select("submission_id", { count: "exact", head: true }),
            supabase.from("evaluations").select("final_scores"),
            supabase.from("problems").select("problem_id", { count: "exact", head: true }),
            supabase.auth.admin.listUsers(),
        ]);

        // ── Submissions count ──
        const totalSubmissions =
            submissionsResult.status === "fulfilled"
                ? submissionsResult.value.count || 0
                : 0;

        // ── Problems count ──
        const totalProblems =
            problemsResult.status === "fulfilled"
                ? problemsResult.value.count || 0
                : 0;

        // ── Users count + role breakdown ──
        let totalUsers = 0;
        let totalStudents = 0;
        let totalInstructors = 0;
        if (usersResult.status === "fulfilled" && usersResult.value.data?.users) {
            const users = usersResult.value.data.users;
            totalUsers = users.length;
            totalStudents = users.filter((u) => u.user_metadata?.role === "student").length;
            totalInstructors = users.filter((u) => u.user_metadata?.role === "instructor").length;
        }

        // ── Evaluations count + average scores ──
        let totalEvaluations = 0;
        let avgScore = 0;
        let avgCorrectness = 0;
        let avgEfficiency = 0;
        let avgStyle = 0;
        if (evaluationsResult.status === "fulfilled" && evaluationsResult.value.data) {
            const evals = evaluationsResult.value.data.filter(
                (e) => e.final_scores && typeof e.final_scores === "object"
            );
            totalEvaluations = evals.length;

            if (evals.length > 0) {
                let sumC = 0, sumE = 0, sumS = 0;
                evals.forEach((e) => {
                    sumC += e.final_scores.correctness || 0;
                    sumE += e.final_scores.efficiency || 0;
                    sumS += e.final_scores.style || 0;
                });
                avgCorrectness = Math.round((sumC / evals.length) * 10) / 10;
                avgEfficiency = Math.round((sumE / evals.length) * 10) / 10;
                avgStyle = Math.round((sumS / evals.length) * 10) / 10;
                avgScore = Math.round(((sumC + sumE + sumS) / evals.length) * 10) / 10;
            }
        }

        // Cache for 60 seconds — landing page doesn't need live-live data
        res.set("Cache-Control", "public, max-age=60");
        res.status(200).json({
            success: true,
            stats: {
                totalSubmissions,
                totalEvaluations,
                totalProblems,
                totalUsers,
                totalStudents,
                totalInstructors,
                avgScore,
                avgCorrectness,
                avgEfficiency,
                avgStyle,
                aiEngines: 3, // Ollama + Gemini + Hugging Face — static fact
                evaluationMetrics: 3, // Correctness, Efficiency, Style — static fact
            },
        });
    } catch (error) {
        console.error("[Public Stats] Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to fetch public stats." });
    }
};

/**
 * GET /api/public/testimonials
 * Returns approved testimonials for the landing page.
 * No authentication required.
 */
exports.getPublicTestimonials = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("testimonials")
            .select("id, display_name, role, rating, text, created_at")
            .eq("approved", true)
            .order("created_at", { ascending: false })
            .limit(10);

        if (error) throw error;

        res.set("Cache-Control", "public, max-age=120");
        res.status(200).json({ success: true, testimonials: data || [] });
    } catch (error) {
        // If testimonials table doesn't exist yet, return empty gracefully
        console.error("[Public Testimonials] Error:", error.message);
        res.status(200).json({ success: true, testimonials: [] });
    }
};
