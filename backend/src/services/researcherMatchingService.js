/**
 * researcherMatchingService.js
 *
 * MODULE 5 — RESEARCHER MATCHING
 *
 * PURPOSE:
 *   Recommends relevant researchers for a problem based on the problem's
 *   `required_expertise` vs `researcher_profiles.research_interests`.
 *
 * MATCHING LOGIC:
 *   - Case-insensitive
 *   - Whitespace-normalized
 *   - score = (matched required expertise / total required expertise) * 100
 *   - Only returns score > 0
 *   - Sorts by score DESC, name ASC
 */

"use strict";

const pool = require("../config/db");

// Re-use parser from student matching
const { parseIntParam } = require("./studentMatchingService");

/**
 * Build a human-readable explanation of why a researcher was recommended.
 */
function buildReason(matched, required, names) {
    if (matched === 0) return "No matching expertise areas.";
    return `Matched ${matched} of ${required} required expertise area${required !== 1 ? "s" : ""}`;
}

/**
 * Find researcher matches for a given problem.
 *
 * @param {number} problemId
 * @param {object} [options]
 * @param {number} [options.limit=10]
 * @returns {Promise<{ required_expertise: string[], matches: object[] } | null>}
 */
async function findResearcherMatches(problemId, options = {}) {
    const { limit = 10 } = options;

    // 1. Load problem
    const problemResult = await pool.query(
        `SELECT id, required_expertise
         FROM problems
         WHERE id = $1`,
        [problemId]
    );

    if (problemResult.rows.length === 0) {
        return null; // 404
    }

    const problem = problemResult.rows[0];

    const required_expertise = Array.isArray(problem.required_expertise)
        ? problem.required_expertise
              .map((k) => (typeof k === "string" ? k.trim() : ""))
              .filter(Boolean)
        : [];

    if (required_expertise.length === 0) {
        return { required_expertise: [], matches: [] };
    }

    const totalRequired = required_expertise.length;
    const normalizedRequired = required_expertise.map(s => s.toLowerCase());

    const query = `
        WITH required AS (
            SELECT unnest($1::text[]) AS req_name
        ),
        researcher_interests AS (
            SELECT rp.id AS profile_id, unnest(rp.research_interests) AS interest_name
            FROM researcher_profiles rp
            WHERE rp.research_interests IS NOT NULL AND array_length(rp.research_interests, 1) > 0
        ),
        matches AS (
            SELECT 
                ri.profile_id,
                COUNT(r.req_name)::int AS matched_count,
                ARRAY_AGG(ri.interest_name) AS matched_expertise
            FROM researcher_interests ri
            JOIN required r ON LOWER(TRIM(ri.interest_name)) = LOWER(TRIM(r.req_name))
            GROUP BY ri.profile_id
        )
        SELECT 
            rp.id AS profile_id,
            rp.user_id,
            rp.institution_id,
            rp.department_id,
            rp.designation,
            rp.bio,
            rp.profile_url,
            u.name,
            m.matched_count,
            m.matched_expertise
        FROM matches m
        JOIN researcher_profiles rp ON rp.id = m.profile_id
        JOIN users u ON u.id = rp.user_id
        ORDER BY m.matched_count DESC, u.name ASC
        LIMIT $2
    `;

    const matchResult = await pool.query(query, [normalizedRequired, limit]);

    const matches = matchResult.rows.map(row => {
        const score = Math.round((row.matched_count / totalRequired) * 100);
        return {
            researcher_id: row.user_id,
            profile_id: row.profile_id,
            institution_id: row.institution_id,
            department_id: row.department_id,
            designation: row.designation,
            bio: row.bio,
            name: row.name,
            profile_url: row.profile_url,
            matched_expertise: row.matched_expertise,
            score: score,
            reason: buildReason(row.matched_count, totalRequired, row.matched_expertise)
        };
    });

    matches.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.name.localeCompare(b.name);
    });

    return {
        required_expertise: required_expertise,
        matches
    };
}

module.exports = {
    findResearcherMatches
};
