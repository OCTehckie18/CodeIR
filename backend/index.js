const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");

const app = express();

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const usersRoutes = require("./routes/users.routes");
const submissionsRoutes = require("./routes/submissions.routes");
const evaluationsRoutes = require("./routes/evaluations.routes");
const publicRoutes = require("./routes/public.routes");
const testimonialsRoutes = require("./routes/testimonials.routes");

app.use("/api", usersRoutes);
app.use("/api", submissionsRoutes);
app.use("/api", evaluationsRoutes);
app.use("/api/public", publicRoutes);
app.use("/api", testimonialsRoutes);

// Basic health check route
app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", message: "CodeIR Express Backend is running!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`[BOOT] ${new Date().toISOString()}`);
    console.log(`Backend Server running on http://localhost:${PORT}`);
    console.log(`Supabase URL: ${process.env.SUPABASE_URL}`);
    
    // Check Supabase Connection
    const { supabase } = require("./config");
    try {
        const { data, error } = await supabase.from("problems").select("count").limit(1);
        if (error) throw error;
        console.log(`[DB] Supabase connection verified. Found ${data.length} records in 'problems'.`);
    } catch (err) {
        console.error(`[DB ERROR] Supabase connection failed:`, err.message);
    }
});
