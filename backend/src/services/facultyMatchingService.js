/**
 * facultyMatchingService.js
 *
 * MODULE 4 — FACULTY-LEVEL EXPERTISE MATCHING
 *
 * PURPOSE:
 *   Answers: "Which faculty members have the expertise required by this problem?"
 *
 *   This is a deeper level than institution matching (matchingService.js):
 *     Institution matching → which organisations have the capability
 *     Faculty matching     → which people have the expertise
 *
 *   The two services are kept separate and complement each other.
 *
 * SCORE FORMULA:
 *   score = (matched_expertise / total_required_expertise) × 100
 *
 *   Example: 3 of 4 required → 75%
 *
 * THRESHOLD:
 *   Any faculty member with score > 0 (at least one matching expertise) is included.
 *   Results are sorted by score DESC, matched_count DESC, name ASC.
 *
 * REQUIRED EXPERTISE SOURCE:
 *   Resolved from the existing expertise table using case-insensitive, trimmed
 *   name matching against the problem's AI-generated required_expertise array.
 *
 * NOTE ON DEMO DATA:
 *   The faculty, departments, and faculty_expertise tables were empty at the
 *   time of Module 4 implementation. Migration 004 inserts synthetic demo
 *   records with names prefixed "[DEMO]" for the hackathon demonstration.
 *   No real faculty names, emails, or contact details are fabricated.
 */

"use strict";

const pool = require("../config/db");
const { explainMatch } = require("./ai/aiOrchestrator");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse and validate a numeric query-string parameter.
 * Returns null if the value was not supplied.
 * Throws an Error with a user-readable message if the value is invalid.
 *
 * @param {*}      value - raw query string value
 * @param {string} name  - parameter name (for error messages)
 * @param {number} min
 * @param {number} max
 * @returns {number|null}
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
 * Build a human-readable explanation of why a faculty member was recommended.
 *
 * @param {number}   matched   - number of matched expertise
 * @param {number}   required  - total required expertise
 * @param {string[]} names     - matched expertise names
 * @returns {string}
 */
function buildReason(matched, required, names) {
    if (matched === 0) return "No matching expertise areas.";

    const list = names.join(", ");

    return `Matches ${matched} of ${required} required expertise area${required !== 1 ? "s" : ""}: ${list}.`;
}

// ---------------------------------------------------------------------------
// Core matching function
// ---------------------------------------------------------------------------

/**
 * Find faculty members whose expertise overlaps with a problem's required
 * expertise.
 *
 * Expertise is resolved in one stage:
 *   1. From the problem's required_expertise (trimmed, lowercased match against
 *      expertise.name).
 *
 * @param {number} problemId
 * @param {object} [options]
 * @param {number} [options.institution_id]  - optional institution filter
 * @param {number} [options.department_id]   - optional department filter
 * @param {number} [options.limit=10]        - max results (1-50)
 * @returns {Promise<{ required_expertise: string[], matches: object[] }>}
 */
async function findFacultyMatches(problemId, options = {}) {
    const { institution_id, department_id, limit = 10 } = options;

    // ------------------------------------------------------------------
    // 1. Load the problem
    // ------------------------------------------------------------------
    const problemResult = await pool.query(
        `SELECT id, category, subcategory, required_expertise
         FROM problems
         WHERE id = $1`,
        [problemId]
    );

    if (problemResult.rows.length === 0) {
        return null; // signals 404 to the controller
    }

    const problem = problemResult.rows[0];

    // ------------------------------------------------------------------
    // 2. Resolve required expertise from the expertise table
    //    Match required_expertise against expertise.name (case-insensitive, trimmed).
    // ------------------------------------------------------------------
    const keywords = Array.isArray(problem.required_expertise)
        ? problem.required_expertise
              .map((k) => (typeof k === "string" ? k.trim() : ""))
              .filter(Boolean)
        : [];

    const candidateNames = keywords
        .map((s) => s.toLowerCase().trim())
        .filter(Boolean);

    if (candidateNames.length === 0) {
        // Nothing to match against
        return { required_expertise: [], matches: [] };
    }

    // Resolve against the expertise table using LOWER(TRIM(name)) comparison
    const expertiseResult = await pool.query(
        `SELECT id, name
         FROM expertise
         WHERE LOWER(TRIM(name)) = ANY($1::text[])`,
        [candidateNames]
    );

    if (expertiseResult.rows.length === 0) {
        // Keywords exist but none match a known expertise record
        return { required_expertise: keywords, matches: [] };
    }

    const requiredExpertise = expertiseResult.rows; // [{id, name}]
    const requiredIds = requiredExpertise.map((e) => e.id);
    const requiredNames = requiredExpertise.map((e) => e.name);
    const totalRequired = requiredIds.length;

    // ------------------------------------------------------------------
    // 3. Find faculty whose expertise overlaps with required IDs.
    //    Joins: faculty_expertise → expertise → faculty → departments → institutions
    //    Filters by institution_id and/or department_id if provided.
    //    Groups by faculty to compute match count and aggregate names.
    // ------------------------------------------------------------------
    const values = [requiredIds];
    const conditions = [];

    if (institution_id !== null && institution_id !== undefined) {
        values.push(institution_id);
        conditions.push(`d.institution_id = $${values.length}`);
    }

    if (department_id !== null && department_id !== undefined) {
        values.push(department_id);
        conditions.push(`f.department_id = $${values.length}`);
    }

    const whereExtra = conditions.length > 0
        ? " AND " + conditions.join(" AND ")
        : "";

    values.push(limit);
    const limitParam = values.length;

    const matchResult = await pool.query(
        `SELECT
             f.id                              AS faculty_id,
             f.name                            AS faculty_name,
             f.designation,
             f.profile_url,
             d.id                              AS department_id,
             d.name                            AS department_name,
             i.id                              AS institution_id,
             i.name                            AS institution_name,
             COUNT(fe.expertise_id)::int       AS matched_count,
             ARRAY_AGG(e.name ORDER BY e.name) AS matched_expertise
         FROM faculty f
         LEFT JOIN departments d     ON d.id = f.department_id
         LEFT JOIN institutions i    ON i.id = d.institution_id
         JOIN  faculty_expertise fe  ON fe.faculty_id = f.id
         JOIN  expertise e           ON e.id = fe.expertise_id
                                     AND fe.expertise_id = ANY($1::int[])
         WHERE 1=1 ${whereExtra}
         GROUP BY f.id, f.name, f.designation, f.profile_url,
                  d.id, d.name, i.id, i.name
         HAVING COUNT(fe.expertise_id) > 0
         ORDER BY matched_count DESC, f.name ASC
         LIMIT $${limitParam}`,
        values
    );

    // ------------------------------------------------------------------
    // 4. Build result objects: compute score and reason for each faculty
    // ------------------------------------------------------------------
    const matches = matchResult.rows.map((row) => {
        const matchedCount = row.matched_count;
        const matchedNames = Array.isArray(row.matched_expertise)
            ? row.matched_expertise.filter(Boolean)
            : [];

        const score = totalRequired > 0
            ? Math.round((matchedCount / totalRequired) * 100)
            : 0;

        return {
            faculty_id: row.faculty_id,
            faculty_name: row.faculty_name,
            designation: row.designation || null,
            profile_url: row.profile_url || null,
            department_id: row.department_id || null,
            department_name: row.department_name || null,
            institution_id: row.institution_id || null,
            institution_name: row.institution_name || null,
            matched_expertise: matchedNames,
            score,
            reason: buildReason(matchedCount, totalRequired, matchedNames)
        };
    });

    // Sort by score DESC, matched_count DESC, name ASC
    // (GROUP BY + ORDER BY in SQL already did matched_count DESC + name ASC,
    //  but we re-sort here so the final order is score → matched_count → name)
    matches.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.matched_expertise.length !== a.matched_expertise.length) {
            return b.matched_expertise.length - a.matched_expertise.length;
        }
        return a.faculty_name.localeCompare(b.faculty_name);
    });

    // Add AI Explanation for top 5 matches
    for (let i = 0; i < Math.min(matches.length, 5); i++) {
        try {
            const aiExplanation = await explainMatch(requiredNames, matches[i].matched_expertise || [], matches[i].score);
            if (aiExplanation) {
                matches[i].reason += "\nAI Insights: " + aiExplanation;
            }
        } catch (e) {
            console.warn(`[AI] Failed to explain match for faculty ${matches[i].faculty_id}:`, e.message);
        }
    }

    return { required_expertise: requiredNames, matches };
}

module.exports = {
    findFacultyMatches,
    parseIntParam
};
