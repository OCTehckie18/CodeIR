require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const usersRoutes = require("./routes/users.routes");
const submissionsRoutes = require("./routes/submissions.routes");
const evaluationsRoutes = require("./routes/evaluations.routes");

app.use("/api", usersRoutes);
app.use("/api", submissionsRoutes);
app.use("/api", evaluationsRoutes);

// Basic health check route
app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", message: "CodeIR Express Backend is running!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend Server running on http://localhost:${PORT}`);
    console.log(`Supabase URL: ${process.env.SUPABASE_URL}`);
});
