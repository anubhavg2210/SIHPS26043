const { generateImpactPassport } = require("../services/impactPassportService");

async function getImpactPassportHandler(req, res) {
    try {
        const problemId = parseInt(req.params.id, 10);
        if (isNaN(problemId)) {
            return res.status(400).json({ message: "Invalid problem ID" });
        }

        const passport = await generateImpactPassport(problemId);
        
        res.json({
            message: "Impact Passport retrieved successfully",
            passport
        });
    } catch (error) {
        console.error("Impact Passport error:", error);
        if (error.message === "Problem not found") {
            return res.status(404).json({ message: "Problem not found" });
        }
        res.status(500).json({
            message: "Failed to generate Impact Passport"
        });
    }
}

module.exports = {
    getImpactPassportHandler
};
