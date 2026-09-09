const express = require("express");
const pool = require("./config/db");
const cors = require("cors");

const {
    findMatchingInstitutions
} = require("./services/matchingService");

const challengeRoutes = require("./routes/challengeRoutes");
const authRoutes = require("./routes/authRoutes");
const problemRoutes = require("./routes/problemRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/challenges", challengeRoutes);

app.get("/health", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            status: "ok",
            database: "connected",
            time: result.rows[0].now
        });
    } catch (error) {
        console.error("Database error:", error);

        res.status(500).json({
            status: "error",
            database: "not connected"
        });
    }
});

app.get("/test-matching", async (req, res) => {
    try {
        const requiredExpertise = [
            "Groundwater",
            "Water Quality",
            "Water Treatment",
            "Environmental Engineering"
        ];

        const matches =
            await findMatchingInstitutions(requiredExpertise);

        res.json({
            success: true,
            required_expertise: requiredExpertise,
            matches: matches
        });

    } catch (error) {
        console.error("Matching error:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 5000;

console.log("🔥 SIH26043 SERVER FILE LOADED - TEST MATCHING VERSION");

app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
});