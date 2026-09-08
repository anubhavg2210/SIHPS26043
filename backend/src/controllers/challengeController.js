const pool = require("../config/db");

const {
    analyzeChallenge
} = require("../services/aiService");

const {
    findMatchingInstitutions
} = require("../services/matchingService");


async function createChallenge(req, res) {
    try {

        const {
            title,
            description,
            district,
            affected_people
        } = req.body;


        // Validate input
        if (!title || !description) {
            return res.status(400).json({
                success: false,
                error: "Title and description are required"
            });
        }


        // --------------------------------
        // 1. Send challenge to AI
        // --------------------------------

        console.log("🤖 Sending challenge to AI...");

        const analysis = await analyzeChallenge({
            title,
            description,
            district,
            affected_people
        });

        console.log("🤖 AI result:", analysis);


        // --------------------------------
        // 2. Save challenge in PostgreSQL
        // --------------------------------

        const query = `
            INSERT INTO challenges (
                title,
                description,
                district,
                affected_people,
                domain,
                subdomain,
                problem_type,
                summary,
                severity,
                urgency,
                ai_confidence
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                $11
            )
            RETURNING *;
        `;


        const values = [
            title,
            description,
            district || null,
            affected_people || null,
            analysis.domain,
            analysis.subdomain,
            analysis.problem_type,
            analysis.summary,
            analysis.severity,
            analysis.urgency,
            analysis.confidence
        ];


        const result = await pool.query(
            query,
            values
        );


        // --------------------------------
        // 3. Find matching institutions
        // --------------------------------

        console.log(
            "🔎 Finding matching institutions..."
        );

        const matches =
            await findMatchingInstitutions(
                analysis.required_expertise
            );


        // --------------------------------
        // 4. Final response
        // --------------------------------

        res.status(201).json({

            success: true,

            challenge: result.rows[0],

            ai_analysis: analysis,

            recommended_institutions: matches

        });


    } catch (error) {

        console.error(
            "❌ Create challenge error:",
            error
        );

        res.status(500).json({

            success: false,

            error: error.message

        });

    }
}


module.exports = {
    createChallenge
};