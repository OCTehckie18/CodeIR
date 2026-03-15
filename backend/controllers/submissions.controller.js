const { supabase, createAuthClient } = require("../config");

// --- PROBLEM BANK ---
exports.createProblem = async (req, res) => {
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
};

exports.getProblems = async (req, res) => {
    try {
        const { limit = 10, offset = 0 } = req.query;
        const { data, error } = await supabase.from("problems")
            .select("*")
            .order("problem_id", { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
        if (error) throw error;
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getProblemById = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase.from("problems").select("*").eq("problem_id", id).single();
        if (error) throw error;
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateProblem = async (req, res) => {
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
};

exports.deleteProblem = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from("problems").delete().eq("problem_id", id);
        if (error) throw error;
        res.status(200).json({ success: true, message: "Problem deleted" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// --- SUBMISSIONS ---
exports.createSubmission = async (req, res) => {
    const { userId, description, code, language, irOutput, translatedCode, validationStatus, problemId } = req.body;
    if (!userId || !description || !code) {
        return res.status(400).json({ success: false, error: "Missing required fields for submission." });
    }
    try {
        console.log(`[Submission] Creating submission for user ${userId}...`);
        const authSupabase = createAuthClient(req);
        let resolvedProblemId = problemId || null;

        if (!resolvedProblemId) {
            // Check if a problem with this description already exists to avoid spamming the 'problems' table
            const { data: existingProblem } = await supabase
                .from("problems")
                .select("problem_id")
                .eq("problem_statement", description)
                .maybeSingle();

            if (existingProblem) {
                resolvedProblemId = existingProblem.problem_id;
                console.log(`[Submission] Reusing existing problem ID: ${resolvedProblemId}`);
            } else {
                const { data: newProblem, error: problemError } = await supabase
                    .from("problems")
                    .insert({ problem_statement: description })
                    .select()
                    .single();
                if (problemError) {
                    console.error("[Submission] Problem creation error:", problemError);
                    throw problemError;
                }
                resolvedProblemId = newProblem.problem_id;
                console.log(`[Submission] Created brand new problem ID: ${resolvedProblemId}`);
            }
        }

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

        if (subError) {
            console.error("[Submission] Insert error:", subError);
            throw subError;
        }
        console.log(`[Submission] Created submission ID: ${sub.submission_id}`);

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
        res.status(201).json({ success: true, message: "Submission successfully securely saved!", submissionId: sub.submission_id });
    } catch (error) {
        console.error("[Submission] Transaction failed:", error);
        res.status(500).json({ success: false, error: "Database transaction failed.", details: error.message });
    }
};

exports.updateSubmission = async (req, res) => {
    const { id } = req.params;
    const { code, description, language } = req.body;
    if (!code) return res.status(400).json({ success: false, error: "Code is required to save a draft." });
    try {
        const authSupabase = createAuthClient(req);
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
        if (!updatedSub) return res.status(404).json({ success: false, error: "Submission not found or access denied." });

        if (description && updatedSub.problem_id) {
            await authSupabase.from("problems").update({ problem_statement: description }).eq("problem_id", updatedSub.problem_id);
        }
        res.status(200).json({ success: true, message: "Draft saved successfully!", submissionId: updatedSub.submission_id });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to save draft.", details: error.message });
    }
};

exports.deleteSubmission = async (req, res) => {
    const { id } = req.params;
    try {
        const authSupabase = createAuthClient(req);
        const { error } = await authSupabase.from("submissions").delete().eq("submission_id", id);
        if (error) throw error;
        res.status(200).json({ success: true, message: "Submission deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to delete submission.", details: error.message });
    }
};

exports.getStudentDashboard = async (req, res) => {
    try {
        const { userId } = req.params;
        const authSupabase = createAuthClient(req);
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
};

exports.getDraft = async (req, res) => {
    const { userId } = req.params;
    const { problemId } = req.query;
    try {
        const authSupabase = createAuthClient(req);
        let query = authSupabase.from("submissions").select(`
                submission_id, source_code, source_language, submission_timestamp,
                problems ( problem_id, problem_statement )
            `)
            .eq("user_id", userId)
            .eq("validation_status", "draft")
            .order("submission_timestamp", { ascending: false })
            .limit(1);
        if (problemId) query = query.eq("problem_id", problemId);
        const { data, error } = await query.maybeSingle();
        if (error) throw error;
        res.status(200).json({ success: true, draft: data || null });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getSubmissionForEvaluation = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const authSupabase = createAuthClient(req);
        
        // Verify user identity
        const { data: { user }, error: authError } = await authSupabase.auth.getUser();
        if (authError || !user) {
            return res.status(401).json({ success: false, error: "Unauthorized access." });
        }

        // Check if instructor. If so, use admin client to bypass RLS. Otherwise use auth client.
        const isInstructor = user.user_metadata?.role === 'instructor';
        const client = isInstructor ? supabase : authSupabase;

        const { data, error } = await client.from("submissions")
            .select("*, pseudocodes ( structured_blocks ), evaluations ( final_scores, teacher_feedback )")
            .eq("submission_id", submissionId)
            .single();
        if (error) throw error;
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getInstructorDashboard = async (req, res) => {
    try {
        const authSupabase = createAuthClient(req);

        // 1. Identify the logged-in user via token
        const { data: { user: authUser }, error: authError } = await authSupabase.auth.getUser();
        if (authError || !authUser) {
            return res.status(401).json({ success: false, error: "Unauthorized access." });
        }

        // 2. Fetch the LATEST user data from Auth Admin (master key) to avoid stale token metadata
        const { data: { user }, error: adminError } = await supabase.auth.admin.getUserById(authUser.id);
        
        if (adminError || !user) {
            console.error(`[Dashboard] Admin fetch failed for ${authUser.id}:`, adminError?.message);
            return res.status(500).json({ success: false, error: "Core identity verification failed." });
        }

        // 3. Check their role from user_metadata (application standard)
        const role = user.user_metadata?.role;
        if (role !== 'instructor') {
            console.error(`[Dashboard] Non-instructor access attempt by ${user.id} (${role})`);
            return res.status(403).json({ success: false, error: "Only instructors can access this dashboard." });
        }

        // 4. User is verified as an instructor - fetch data using ADMIN client to bypass RLS restrictions
        console.log(`[Dashboard] Verified instructor ${user.id} accessing dashboard...`);

        // Fetch all users to map identities (better than N separate requests)
        const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
        if (usersError) {
            console.error("[Dashboard] Error listing users for identity mapping:", usersError.message);
        }
        const userMap = (usersData?.users || []).reduce((acc, u) => {
            acc[u.id] = {
                email: u.email,
                name: u.user_metadata?.display_name || u.email?.split('@')[0] || "Student"
            };
            return acc;
        }, {});

        // Fetch ALL submissions (resolves client-side pagination, search, filter bug)
        const { data: rawData, error } = await supabase.from("submissions")
            .select(`
                submission_id, submission_timestamp, validation_status, source_code, user_id,
                problems ( problem_statement ),
                evaluations ( evaluation_id, final_scores )
            `)
            .order("submission_timestamp", { ascending: false });

        if (error) {
            console.error("[Dashboard] Instructor fetch error:", error);
            throw error;
        }

        let globalStats = { total: 0, evaluated: 0, pending: 0 };
        if (rawData) {
            globalStats.total = rawData.length;
            globalStats.evaluated = rawData.filter(s => 
                s.evaluations && (Array.isArray(s.evaluations) ? s.evaluations.length > 0 : Object.keys(s.evaluations).length > 0)
            ).length;
            globalStats.pending = globalStats.total - globalStats.evaluated;
        }

        // Enrich with identity
        const data = (rawData || []).map(sub => ({
            ...sub,
            student_email: userMap[sub.user_id]?.email || "unknown@student.com",
            student_name: userMap[sub.user_id]?.name || "Unknown Student"
        }));
        
        console.log(`[Dashboard] Fetched ${data?.length || 0} enriched submissions`);
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.status(200).json({ 
            success: true, 
            data, 
            total: data?.length || 0,
            globalStats
        });
    } catch (error) {
        console.error("[Dashboard] Controller failed:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};
