const pool = require("../config/db");
const { analyzeChallenge } = require("../services/aiService");
const {
    isValidTransition
} = require("../services/statusService");
const { calculatePriority } = require("../services/priorityService");
const {
    findDuplicates,
    getDuplicatesForProblem
} = require("../services/duplicateService");
async function createProblem(req, res) {
    try {
        const {
            title,
            description,
            district,
            city,
            address,
            latitude,
            longitude,
            affected_people,
            available_from,
            available_until
        } = req.body;

        if (!title || !description) {
            return res.status(400).json({
                message: "Title and description are required"
            });
        }

        const ai = await analyzeChallenge({
            title,
            description,
            district,
            affected_people
        });

        const priorityScore = calculatePriority({
    severity: ai.severity,
    affectedPeople: affected_people || 0,
    recurrence: 0,
    dependencyImportance: 0,
    daysUnresolved: 0
});
console.log("🔥 PRIORITY SCORE:", priorityScore);

        const result = await pool.query(
    `INSERT INTO problems
    (
        reporter_id,
        title,
        description,
        category,
        subcategory,
        district,
        city,
        address,
        latitude,
        longitude,
        available_from,
        available_until,
        affected_people,
        ai_summary,
        ai_keywords,
        severity,
        urgency,
        ai_confidence,
        priority_score
    )
    VALUES
    ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    RETURNING *`,
    [
        req.user.id,
        title,
        description,
        ai.domain,
        ai.subdomain,
        district || null,
        city || null,
        address || null,
        latitude || null,
        longitude || null,
        available_from || null,
        available_until || null,
        affected_people || null,
        ai.summary,
        ai.keywords,
        ai.severity,
        ai.urgency,
        ai.confidence,
        priorityScore
    ]
);
               
        const problem = result.rows[0];

        // ------------------------------------------------------------------
        // Duplicate detection — runs after insert so the new problem is
        // already in the DB. Errors are caught and logged; they must never
        // cause problem creation to fail.
        // ------------------------------------------------------------------
        let duplicateCheck = null;

        try {
            const duplicates = await findDuplicates(problem.id);
            duplicateCheck = {
                checked: true,
                duplicates_found: duplicates.length,
                possible_duplicates: duplicates.filter(
                    (d) => d.classification === "POSSIBLE_DUPLICATE"
                ).length,
                results: duplicates
            };
        } catch (dupError) {
            console.error("⚠️  Duplicate detection failed (non-fatal):", dupError.message);
            duplicateCheck = {
                checked: false,
                error: "Duplicate detection temporarily unavailable"
            };
        }

        res.status(201).json({
            message: "Problem submitted successfully",
            problem,
            ai_analysis: ai,
            duplicate_check: duplicateCheck
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to create problem",
            error: error.message
        });
    }
}

async function getProblems(req, res) {
    try {
        const {
            category,
            district,
            status
        } = req.query;

        let query = `
            SELECT
                p.*,
                u.name AS reporter_name
            FROM problems p
            LEFT JOIN users u
                ON p.reporter_id = u.id
            WHERE 1=1
        `;

        const values = [];

        if (category) {
            values.push(category);
            query += ` AND p.category = $${values.length}`;
        }

        if (district) {
            values.push(district);
            query += ` AND p.district = $${values.length}`;
        }

        if (status) {
            values.push(status);
            query += ` AND p.status = $${values.length}`;
        }

        query += " ORDER BY p.created_at DESC";

        const result = await pool.query(query, values);

        res.json({
            count: result.rows.length,
            problems: result.rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch problems"
        });
    }
}

async function getProblemById(req, res) {
    try {
        const result = await pool.query(
            `SELECT *
             FROM problems
             WHERE id = $1`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Problem not found"
            });
        }

        res.json({
            problem: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch problem"
        });
    }
}

async function getMyProblems(req, res) {
    try {
        const result = await pool.query(
            `SELECT *
             FROM problems
             WHERE reporter_id = $1
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.json({
            problems: result.rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch your problems"
        });
    }
}

async function updateProblemStatus(req, res) {
    const problemId = req.params.id;
    const { status, note } = req.body;

    try {
        if (!status) {
            return res.status(400).json({
                message: "New status is required"
            });
        }

        const problemResult = await pool.query(
            `SELECT id, status
             FROM problems
             WHERE id = $1`,
            [problemId]
        );

        if (problemResult.rows.length === 0) {
            return res.status(404).json({
                message: "Problem not found"
            });
        }

        const currentStatus = problemResult.rows[0].status;

        if (!isValidTransition(currentStatus, status)) {
            return res.status(400).json({
                message: `Invalid status transition from ${currentStatus} to ${status}`
            });
        }

        await pool.query(
            `UPDATE problems
             SET status = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [status, problemId]
        );

        await pool.query(
            `INSERT INTO problem_status_history
             (problem_id, old_status, new_status, changed_by, note)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                problemId,
                currentStatus,
                status,
                req.user.id,
                note || null
            ]
        );

        res.json({
            message: "Problem status updated successfully",
            problem_id: Number(problemId),
            old_status: currentStatus,
            new_status: status
        });

    } catch (error) {
        console.error("Status update error:", error);

        res.status(500).json({
            message: "Failed to update problem status"
        });
    }
}


async function getProblemStatusHistory(req, res) {
    const problemId = req.params.id;

    try {
        const problemResult = await pool.query(
            `SELECT id
             FROM problems
             WHERE id = $1`,
            [problemId]
        );

        if (problemResult.rows.length === 0) {
            return res.status(404).json({
                message: "Problem not found"
            });
        }

        const result = await pool.query(
            `SELECT
                id,
                old_status,
                new_status,
                changed_by,
                note,
                created_at
             FROM problem_status_history
             WHERE problem_id = $1
             ORDER BY created_at ASC`,
            [problemId]
        );

        res.json({
            problem_id: Number(problemId),
            history: result.rows
        });

    } catch (error) {
        console.error("Status history error:", error);

        res.status(500).json({
            message: "Failed to fetch status history"
        });
    }
}

async function getDuplicates(req, res) {
    const problemId = parseInt(req.params.id, 10);

    if (isNaN(problemId)) {
        return res.status(400).json({
            message: "Invalid problem id"
        });
    }

    try {
        // Verify the problem exists
        const problemResult = await pool.query(
            `SELECT id FROM problems WHERE id = $1`,
            [problemId]
        );

        if (problemResult.rows.length === 0) {
            return res.status(404).json({
                message: "Problem not found"
            });
        }

        const duplicates = await getDuplicatesForProblem(problemId);

        res.json({
            problem_id: problemId,
            duplicates
        });

    } catch (error) {
        console.error("Duplicate fetch error:", error);

        res.status(500).json({
            message: "Failed to fetch duplicates"
        });
    }
}

module.exports = {
    createProblem,
    getProblems,
    getProblemById,
    getMyProblems,
    updateProblemStatus,
    getProblemStatusHistory,
    getDuplicates
};