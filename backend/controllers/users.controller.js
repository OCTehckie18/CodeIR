const { supabase, createAuthClient } = require("../config");

// GET /api/profiles/:userId  —  Read profile
exports.getProfile = async (req, res) => {
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
};

// PUT /api/profiles/:userId  —  Update profile metadata
exports.updateProfile = async (req, res) => {
    const { userId } = req.params;
    const { display_name, bio, theme_preference, avatar_url } = req.body;

    try {
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
};

// DELETE /api/profiles/:userId  —  Delete account and cascade all submissions
exports.deleteAccount = async (req, res) => {
    const { userId } = req.params;
    try {
        const { error: subDeleteError } = await supabase
            .from("submissions")
            .delete()
            .eq("user_id", userId);

        if (subDeleteError) {
            console.warn("Could not delete submissions:", subDeleteError.message);
        }

        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
        if (authDeleteError) throw authDeleteError;

        res.status(200).json({ success: true, message: "Account deleted successfully." });
    } catch (error) {
        console.error("Account Delete Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET /api/users  —  Return a list of all registered users
exports.listUsers = async (req, res) => {
    try {
        const { data, error } = await supabase.auth.admin.listUsers();
        if (error) throw error;

        const users = data.users.map(u => {
            const meta = u.user_metadata || {};
            return {
                id: u.id,
                email: u.email,
                name: meta.display_name || u.email?.split("@")[0] || "User",
                role: meta.role || "student",
                avatarColor: meta.avatar_url || (meta.role === "instructor" ? "bg-emerald-500" : "bg-blue-500"),
            };
        });

        res.status(200).json({ success: true, users });
    } catch (error) {
        console.error("Users list GET Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

// --- SKILLS & BADGES ---

exports.getSkills = async (req, res) => {
    const { userId } = req.params;
    try {
        const authSupabase = createAuthClient(req);
        const { data, error } = await authSupabase
            .from("user_skills")
            .select("*")
            .eq("user_id", userId);
        if (error) throw error;
        res.status(200).json({ success: true, skills: data });
    } catch (error) {
        console.error("Get Skills Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.addSkill = async (req, res) => {
    const { userId } = req.params;
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "Skill name is required." });
    try {
        const authSupabase = createAuthClient(req);
        const { data, error } = await authSupabase
            .from("user_skills")
            .insert({ user_id: userId, name, color })
            .select()
            .single();
        if (error) throw error;
        res.status(201).json({ success: true, skill: data });
    } catch (error) {
        console.error("Add Skill Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteSkill = async (req, res) => {
    const { skillId } = req.params;
    try {
        const authSupabase = createAuthClient(req);
        const { error } = await authSupabase
            .from("user_skills")
            .delete()
            .eq("id", skillId);
        if (error) throw error;
        res.status(200).json({ success: true, message: "Skill deleted successfully." });
    } catch (error) {
        console.error("Delete Skill Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};
