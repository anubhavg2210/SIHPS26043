const pool = require("../config/db");

async function getOverview() {
    const query = `
        SELECT
            (SELECT COUNT(*) FROM problems) AS total_problems,
            (SELECT COUNT(*) FROM problems WHERE status NOT IN ('RESOLVED', 'REJECTED')) AS active_problems,
            (SELECT COUNT(*) FROM problems WHERE priority_score > 50 OR severity >= 4) AS high_priority,
            (SELECT COUNT(*) FROM problems WHERE status = 'RESOLVED') AS resolved_problems
    `;
    const res = await pool.query(query);
    return res.rows[0] || {
        total_problems: 0, active_problems: 0, high_priority: 0, resolved_problems: 0
    };
}

async function getPipeline() {
    // Note: expertise_matches might not exist if they don't store matches, but based on M4 it should exist. Let's wrap in safe subqueries.
    // Wait, let's use what we know exists from M4 and M9. M4 might not have stored matches persistently unless a team was formed.
    // Actually, M5/M6/M7 might have stored them. Let's just query `problems` and `solutions` etc.
    const query = `
        SELECT
            (SELECT COUNT(*) FROM problems) AS reported,
            (
                SELECT COUNT(DISTINCT problem_id) 
                FROM solutions
            ) AS solved,
            (
                SELECT COUNT(DISTINCT problem_id) 
                FROM solution_implementations
            ) AS piloted,
            (
                SELECT COUNT(DISTINCT i.problem_id) 
                FROM implementation_impact_assessments ia
                JOIN solution_implementations i ON ia.implementation_id = i.id
                WHERE ia.verification_status = 'VERIFIED'
            ) AS impact_verified
    `;
    const res = await pool.query(query);
    return res.rows[0] || {
        reported: 0, solved: 0, piloted: 0, impact_verified: 0
    };
}

async function getCommunity() {
    const query = `
        SELECT
            (SELECT COUNT(*) FROM problem_supports) AS total_support,
            (SELECT COUNT(*) FROM problem_comments) AS total_comments,
            (
                SELECT json_agg(row_to_json(t)) FROM (
                    SELECT category, COUNT(*) as count 
                    FROM problems 
                    GROUP BY category 
                    ORDER BY count DESC 
                    LIMIT 5
                ) t
            ) AS top_categories
    `;
    const res = await pool.query(query);
    return res.rows[0] || {
        total_support: 0, total_comments: 0, top_categories: []
    };
}

async function getTrust() {
    const query = `
        SELECT
            (SELECT COUNT(*) FROM trust_events) AS total_flagged,
            (SELECT COUNT(*) FROM trust_events WHERE status = 'FLAGGED') AS pending_review,
            (SELECT COUNT(*) FROM trust_events WHERE status = 'REVIEWED') AS reviewed,
            (
                SELECT json_agg(row_to_json(t)) FROM (
                    SELECT severity, COUNT(*) as count 
                    FROM trust_events 
                    GROUP BY severity 
                    ORDER BY count DESC
                ) t
            ) AS severity_breakdown
    `;
    const res = await pool.query(query);
    return res.rows[0] || {
        total_flagged: 0, pending_review: 0, reviewed: 0, severity_breakdown: []
    };
}

module.exports = {
    getOverview,
    getPipeline,
    getCommunity,
    getTrust
};
