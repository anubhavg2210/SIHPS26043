const pool = require("../config/db");

const {
    analyzeChallenge
} = require("../services/aiService");

const {
    findMatchingInstitutions
} = require("../services/matchingService");

const {
    calculatePriority
} = require("../services/priorityService");


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
        // 2. Save challenge in PostgreSQL (challenges table)
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

        let problemRecord = result.rows[0];

        // ------------------------------------------------------------------
        // Dual-insert into problems table so it appears in /explore catalog
        // ------------------------------------------------------------------
        try {
            const priorityScore = calculatePriority({
                severity: analysis.severity,
                affectedPeople: affected_people || 0,
                recurrence: 0,
                dependencyImportance: 0,
                daysUnresolved: 0
            });

            const reporterId = req.user ? req.user.id : null;

            const probRes = await pool.query(
                `INSERT INTO problems
                (
                    reporter_id,
                    title,
                    description,
                    category,
                    subcategory,
                    district,
                    affected_people,
                    ai_summary,
                    ai_keywords,
                    required_expertise,
                    severity,
                    urgency,
                    ai_confidence,
                    priority_score
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING *`,
                [
                    reporterId,
                    title,
                    description,
                    analysis.domain,
                    analysis.subdomain,
                    district || null,
                    affected_people ? Number(affected_people) : null,
                    analysis.summary,
                    analysis.keywords,
                    analysis.required_expertise,
                    analysis.severity,
                    analysis.urgency,
                    analysis.confidence,
                    priorityScore
                ]
            );

            if (probRes.rows.length > 0) {
                problemRecord = probRes.rows[0];

                if (analysis.dossier) {
                    try {
                        await pool.query(
                            `INSERT INTO challenge_dossiers
                            (problem_id, domain, subdomain, problem_type, summary, severity, urgency_label, urgency_score, dossier_data, overall_confidence, requires_human_review)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                            [
                                problemRecord.id,
                                analysis.domain,
                                analysis.subdomain,
                                analysis.problem_type,
                                analysis.summary,
                                analysis.severity,
                                analysis.dossier.assessment?.urgency || 'Medium',
                                analysis.urgency,
                                JSON.stringify(analysis.dossier),
                                analysis.confidence,
                                analysis.dossier.quality?.requires_human_review || false
                            ]
                        );
                    } catch (dossierErr) {
                        console.warn("⚠️ Challenge dossier insert from challengeController (non-fatal):", dossierErr.message);
                    }
                }
            }
        } catch (probInsertErr) {
            console.warn("⚠️ Problems table dual insert from challengeController (non-fatal):", probInsertErr.message);
        }

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

            problem: problemRecord,

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