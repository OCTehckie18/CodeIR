const { supabase, createAuthClient } = require("../config");

/**
 * GET /api/testimonials/eligibility
 * Checks if the logged-in user is eligible to submit a testimonial.
 * Criteria: account ≥30 days old AND ≥5 submissions.
 */
exports.checkEligibility = async (req, res) => {
    try {
        const authSupabase = createAuthClient(req);
        const { data: { user }, error: authError } = await authSupabase.auth.getUser();
        if (authError || !user) {
            return res.status(401).json({ success: false, error: "Unauthorized." });
        }

        // Check account age
        const createdAt = new Date(user.created_at);
        const now = new Date();
        const daysSinceCreation = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

        // Check submission count
        const { count, error: countError } = await supabase
            .from("submissions")
            .select("submission_id", { count: "exact", head: true })
            .eq("user_id", user.id);

        if (countError) throw countError;

        const submissionCount = count || 0;
        const isEligible = daysSinceCreation >= 30 && submissionCount >= 5;

        // Check if user already submitted a testimonial
        let alreadySubmitted = false;
        try {
            const { data: existing } = await supabase
                .from("testimonials")
                .select("id")
                .eq("user_id", user.id)
                .maybeSingle();
            alreadySubmitted = !!existing;
        } catch {
            // Table might not exist yet — treat as not submitted
        }

        res.status(200).json({
            success: true,
            eligible: isEligible,
            alreadySubmitted,
            daysSinceCreation,
            submissionCount,
        });
    } catch (error) {
        console.error("[Testimonials] Eligibility check error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/testimonials/mine
 * Returns the logged-in user's own testimonial (if any).
 */
exports.getMyTestimonial = async (req, res) => {
    try {
        const authSupabase = createAuthClient(req);
        const { data: { user }, error: authError } = await authSupabase.auth.getUser();
        if (authError || !user) {
            return res.status(401).json({ success: false, error: "Unauthorized." });
        }

        const { data, error } = await supabase
            .from("testimonials")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

        if (error) throw error;

        res.status(200).json({ success: true, testimonial: data || null });
    } catch (error) {
        console.error("[Testimonials] Get mine error:", error.message);
        res.status(200).json({ success: true, testimonial: null });
    }
};

/**
 * POST /api/testimonials
 * Submit a testimonial. Auto-approved for MVP.
 */
exports.submitTestimonial = async (req, res) => {
    try {
        const authSupabase = createAuthClient(req);
        const { data: { user }, error: authError } = await authSupabase.auth.getUser();
        if (authError || !user) {
            return res.status(401).json({ success: false, error: "Unauthorized." });
        }

        const { text, rating } = req.body;

        if (!text || !rating) {
            return res.status(400).json({ success: false, error: "Text and rating are required." });
        }

        if (text.length > 280) {
            return res.status(400).json({ success: false, error: "Testimonial must be 280 characters or less." });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, error: "Rating must be between 1 and 5." });
        }

        // Check if already submitted
        const { data: existing } = await supabase
            .from("testimonials")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (existing) {
            return res.status(409).json({ success: false, error: "You have already submitted a testimonial." });
        }

        const displayName =
            user.user_metadata?.display_name ||
            user.email?.split("@")[0] ||
            "User";
        const role = user.user_metadata?.role || "student";

        const { data, error } = await supabase
            .from("testimonials")
            .insert({
                user_id: user.id,
                display_name: displayName,
                role,
                rating: parseInt(rating),
                text: text.trim(),
                approved: true, // Auto-approve for MVP
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ success: true, testimonial: data });
    } catch (error) {
        console.error("[Testimonials] Submit error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};
