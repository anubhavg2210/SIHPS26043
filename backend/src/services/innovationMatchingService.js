/**
 * innovationMatchingService.js
 *
 * MODULE 6 — STARTUP & MSME MATCHING
 *
 * PURPOSE:
 *   Recommends relevant startups/MSMEs for a problem based on
 *   `problems.required_expertise` vs `innovation_profiles.innovation_areas`.
 *
 * MATCHING LOGIC:
 *   - Case-insensitive
 *   - Whitespace-normalized
 *   - score = (matched required expertise / total required expertise) * 100
 *   - Only returns score > 0
 *   - Sorts by score DESC, organization name ASC
 *
 * USAGE:
 *   findInnovationMatches(problemId, { organizationType, limit })
 *   - organizationType: 'STARTUP' or 'MSME' (used as filter)
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
 * Build a human-readable explanation of why an organization was recommended.
 */
function buildReason(matched, required) {
    if (matched === 0) return "No matching innovation areas.";
    return `Matched ${matched} of ${required} required expertise area${required !== 1 ? "s" : ""}`;
}

/**
 * Find organization matches for a given problem, filtered by organization type.
 *
 * @param {number} problemId
 * @param {object} [options]
 * @param {string} [options.organizationType] - 'STARTUP' or 'MSME'
 * @param {number} [options.limit=10] - max results (1-50)
 * @returns {Promise<{ required_expertise: string[], matches: object[] } | null>}
 */
async function findInnovationMatches(problemId, options = {}) {
    const { organizationType, limit = 10 } = options;

    // 1. Load problem
    const problemResult = await pool.query(
        `SELECT id, required_expertise
         FROM problems
         WHERE id = $1`,
        [problemId]
    );

    if (problemResult.rows.length === 0) {
        return null; // signals 404 to the controller
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
    const normalizedRequired = required_expertise.map((s) => s.toLowerCase());

    // 2. Find matching organizations via innovation_profiles
    // Build the query with optional organization_type filter
    const values = [normalizedRequired];
    let typeFilter = "";

    if (organizationType) {
        values.push(organizationType);
        typeFilter = `AND o.organization_type = $${values.length}`;
    }

    values.push(limit);
    const limitParam = values.length;

    const query = `
        WITH required AS (
            SELECT unnest($1::text[]) AS req_name
        ),
        org_areas AS (
            SELECT ip.id AS profile_id,
                   ip.organization_id,
                   unnest(ip.innovation_areas) AS area_name
            FROM innovation_profiles ip
            WHERE ip.innovation_areas IS NOT NULL
              AND array_length(ip.innovation_areas, 1) > 0
        ),
        matches AS (
            SELECT
                oa.profile_id,
                oa.organization_id,
                COUNT(oa.area_name)::int AS matched_count,
                ARRAY_AGG(DISTINCT oa.area_name) AS matched_areas
            FROM org_areas oa
            JOIN required r ON LOWER(TRIM(oa.area_name)) = LOWER(TRIM(r.req_name))
            GROUP BY oa.profile_id, oa.organization_id
        )
        SELECT
            m.profile_id,
            m.organization_id,
            o.name AS organization_name,
            o.organization_type,
            o.description AS org_description,
            o.website,
            o.district,
            o.city,
            ip.description AS innovation_description,
            ip.innovation_areas,
            m.matched_count,
            m.matched_areas
        FROM matches m
        JOIN organizations o ON o.id = m.organization_id
        JOIN innovation_profiles ip ON ip.id = m.profile_id
        WHERE 1=1 ${typeFilter}
        ORDER BY m.matched_count DESC, o.name ASC
        LIMIT $${limitParam}
    `;

    const matchResult = await pool.query(query, values);

    const matches = matchResult.rows.map((row) => {
        const score = Math.round((row.matched_count / totalRequired) * 100);

        return {
            organization_id: row.organization_id,
            profile_id: row.profile_id,
            name: row.organization_name,
            organization_type: row.organization_type,
            description: row.org_description,
            innovation_description: row.innovation_description,
            website: row.website,
            district: row.district,
            city: row.city,
            innovation_areas: row.innovation_areas,
            matched_areas: row.matched_areas,
            score,
            reason: buildReason(row.matched_count, totalRequired),
        };
    });

    // Re-sort by score DESC, name ASC for determinism
    matches.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.name.localeCompare(b.name);
    });

    return {
        required_expertise,
        matches,
    };
}

module.exports = {
    findInnovationMatches,
    parseIntParam,
};
