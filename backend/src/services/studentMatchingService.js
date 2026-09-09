/**
 * studentMatchingService.js
 *
 * MODULE 5 — STUDENT MATCHING
 *
 * PURPOSE:
 *   Recommends relevant students for a problem based on the problem's
 *   `required_expertise` vs `student_profiles.skills`.
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

/**
 * Parse and validate a numeric query-string parameter.
 * Returns null if the value was not supplied.
 * Throws an Error with a user-readable message if the value is invalid.
 */
function parseIntParam(value, name, min, max) {
    if (value === undefined || value === null || value === "") return null;

    const n = parseInt(value, 10);

    if (isNaN(n) || String(n) !== String(value).trim()) {
        throw new Error(`"${name}" must be a valid integer`);
    }

    if (n < min || n > max) {
        throw new Error(`"${name}" must be between ${min} and ${max}`);
    }

    return n;
}

/**
 * Build a human-readable explanation of why a student was recommended.
 */
function buildReason(matched, required) {
    if (matched === 0) return "No matching expertise areas.";
    return `Matched ${matched} of ${required} required expertise area${required !== 1 ? "s" : ""}`;
}

/**
 * Find student matches for a given problem.
 *
 * @param {number} problemId
 * @param {object} [options]
 * @param {number} [options.limit=10]
 * @returns {Promise<{ required_expertise: string[], matches: object[] } | null>}
 */
async function findStudentMatches(problemId, options = {}) {
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

    // We build a normalized list to match against
    const normalizedRequired = required_expertise.map(s => s.toLowerCase());

    // 2. Fetch all student profiles that have skills
    // In a massive production system we would use GIN indexes on skills array,
    // but array intersection requires exact matching. For MVP, we fetch and
    // filter in Node since there are no ML embeddings or PG pg_trgm setups requested.
    // Actually, we can do it in SQL!
    // Using unnest and array_agg we can find overlap case insensitively.
    
    // We will do this efficiently in SQL:
    const query = `
        WITH required AS (
            SELECT unnest($1::text[]) AS req_name
        ),
        student_skills AS (
            SELECT sp.id AS profile_id, unnest(sp.skills) AS skill_name
            FROM student_profiles sp
            WHERE sp.skills IS NOT NULL AND array_length(sp.skills, 1) > 0
        ),
        matches AS (
            SELECT 
                ss.profile_id,
                COUNT(r.req_name)::int AS matched_count,
                ARRAY_AGG(ss.skill_name) AS matched_skills
            FROM student_skills ss
            JOIN required r ON LOWER(TRIM(ss.skill_name)) = LOWER(TRIM(r.req_name))
            GROUP BY ss.profile_id
        )
        SELECT 
            sp.id AS profile_id,
            sp.user_id,
            sp.institution_id,
            sp.department_id,
            sp.course,
            sp.graduation_year,
            u.name,
            m.matched_count,
            m.matched_skills
        FROM matches m
        JOIN student_profiles sp ON sp.id = m.profile_id
        JOIN users u ON u.id = sp.user_id
        ORDER BY m.matched_count DESC, u.name ASC
        LIMIT $2
    `;

    const matchResult = await pool.query(query, [normalizedRequired, limit]);

    const matches = matchResult.rows.map(row => {
        const score = Math.round((row.matched_count / totalRequired) * 100);
        return {
            student_id: row.user_id,
            profile_id: row.profile_id,
            institution_id: row.institution_id,
            department_id: row.department_id,
            course: row.course,
            graduation_year: row.graduation_year,
            name: row.name,
            matched_skills: row.matched_skills,
            score: score,
            reason: buildReason(row.matched_count, totalRequired)
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
    findStudentMatches,
    parseIntParam
};
