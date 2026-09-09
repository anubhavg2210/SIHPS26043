/**
 * duplicateService.js
 *
 * MODULE 1 — DUPLICATE DETECTION
 *
 * Compares a newly submitted problem against existing problems and
 * identifies potentially duplicate or similar problems using:
 *
 *   - PostgreSQL pg_trgm similarity() for title and description
 *   - Exact-match bonuses for category, subcategory, and district
 *
 * Scoring weights:
 *   title        -> 35%
 *   description  -> 40%
 *   category     -> 10%
 *   subcategory  -> 10%
 *   district     ->  5%
 *                   ---
 *                   100%
 *
 * Classification thresholds:
 *   >= 0.80  -> POSSIBLE_DUPLICATE
 *   >= 0.60  -> SIMILAR
 *   <  0.60  -> not flagged (excluded from results)
 */

"use strict";

const pool = require("../config/db");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEIGHTS = {
    title: 0.35,
    description: 0.40,
    category: 0.10,
    subcategory: 0.10,
    district: 0.05
};

const THRESHOLD_DUPLICATE = 0.80;
const THRESHOLD_SIMILAR = 0.60;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derives a human-readable list of signals that explain the similarity score.
 *
 * @param {object} problem   - The new problem (with title, description, etc.)
 * @param {object} candidate - An existing problem row from the DB
 * @param {number} titleSim  - pg_trgm similarity score for title  (0-1)
 * @param {number} descSim   - pg_trgm similarity score for description (0-1)
 * @returns {string[]}
 */
function buildSignals(problem, candidate, titleSim, descSim) {
    const signals = [];

    if (titleSim >= 0.70) {
        signals.push("similar title");
    }

    if (descSim >= 0.60) {
        signals.push("similar description");
    }

    if (
        problem.category &&
        candidate.category &&
        problem.category.toLowerCase() === candidate.category.toLowerCase()
    ) {
        signals.push("same category");
    }

    if (
        problem.subcategory &&
        candidate.subcategory &&
        problem.subcategory.toLowerCase() ===
            candidate.subcategory.toLowerCase()
    ) {
        signals.push("same subcategory");
    }

    if (
        problem.district &&
        candidate.district &&
        problem.district.toLowerCase() === candidate.district.toLowerCase()
    ) {
        signals.push("same district");
    }

    return signals;
}

/**
 * Classify a score into a string label.
 *
 * @param {number} score
 * @returns {"POSSIBLE_DUPLICATE"|"SIMILAR"|null}
 */
function classifyScore(score) {
    if (score >= THRESHOLD_DUPLICATE) return "POSSIBLE_DUPLICATE";
    if (score >= THRESHOLD_SIMILAR) return "SIMILAR";
    return null;
}

// ---------------------------------------------------------------------------
// Core detection function
// ---------------------------------------------------------------------------

/**
 * Find similar / duplicate problems for a given problem.
 *
 * The function:
 *   1. Fetches the target problem from the DB (so callers can pass just an id).
 *   2. Uses pg_trgm similarity() inside a single SQL query to compute
 *      text similarity for all candidates simultaneously — efficient even
 *      for large tables because pg_trgm can be index-accelerated.
 *   3. Computes a weighted combined score in JS.
 *   4. Saves flagged matches to problem_duplicate_matches (upsert).
 *   5. Returns sorted results (highest score first).
 *
 * @param {number} problemId - The id of the problem to check.
 * @returns {Promise<Array>} Array of duplicate/similar match objects.
 */
async function findDuplicates(problemId) {
    // ------------------------------------------------------------------
    // 1. Load the target problem
    // ------------------------------------------------------------------
    const targetResult = await pool.query(
        `SELECT id, title, description, category, subcategory, district
         FROM problems
         WHERE id = $1`,
        [problemId]
    );

    if (targetResult.rows.length === 0) {
        throw new Error(`Problem with id ${problemId} not found`);
    }

    const problem = targetResult.rows[0];

    // Guard against empty title / description
    const safeTitle = (problem.title || "").trim();
    const safeDesc = (problem.description || "").trim();

    if (safeTitle.length < 3 && safeDesc.length < 10) {
        // Nothing meaningful to compare — return empty
        return [];
    }

    // ------------------------------------------------------------------
    // 2. Retrieve candidates with pg_trgm similarity scores
    //    We exclude the problem itself ($1) and only pull problems
    //    where at least one pg_trgm score exceeds a low pre-filter
    //    threshold (0.20) to avoid scanning rows that are obviously
    //    unrelated.  The real combined threshold is applied in JS.
    // ------------------------------------------------------------------
    const candidateResult = await pool.query(
        `SELECT
            p.id,
            p.title,
            p.description,
            p.category,
            p.subcategory,
            p.district,
            p.status,
            p.created_at,
            similarity($2, p.title)       AS title_sim,
            similarity($3, p.description) AS desc_sim
         FROM problems p
         WHERE
             p.id <> $1
             AND (
                 similarity($2, p.title) >= 0.20
                 OR similarity($3, p.description) >= 0.20
             )`,
        [problemId, safeTitle, safeDesc]
    );

    if (candidateResult.rows.length === 0) {
        return [];
    }

    // ------------------------------------------------------------------
    // 3. Compute weighted combined score for each candidate
    // ------------------------------------------------------------------
    const matches = [];

    for (const candidate of candidateResult.rows) {
        const titleSim = parseFloat(candidate.title_sim) || 0;
        const descSim = parseFloat(candidate.desc_sim) || 0;

        // Exact-match bonuses (1 = match, 0 = no match / null)
        const categorySim =
            problem.category &&
            candidate.category &&
            problem.category.toLowerCase() ===
                candidate.category.toLowerCase()
                ? 1
                : 0;

        const subcategorySim =
            problem.subcategory &&
            candidate.subcategory &&
            problem.subcategory.toLowerCase() ===
                candidate.subcategory.toLowerCase()
                ? 1
                : 0;

        const districtSim =
            problem.district &&
            candidate.district &&
            problem.district.toLowerCase() ===
                candidate.district.toLowerCase()
                ? 1
                : 0;

        const combinedScore =
            titleSim * WEIGHTS.title +
            descSim * WEIGHTS.description +
            categorySim * WEIGHTS.category +
            subcategorySim * WEIGHTS.subcategory +
            districtSim * WEIGHTS.district;

        const classification = classifyScore(combinedScore);

        if (!classification) {
            // Below the minimum threshold — skip
            continue;
        }

        const signals = buildSignals(
            problem,
            candidate,
            titleSim,
            descSim
        );

        matches.push({
            problem_id: candidate.id,
            similarity: parseFloat(combinedScore.toFixed(4)),
            percentage: Math.round(combinedScore * 100),
            classification,
            signals,
            // internal — used when persisting
            _candidate: candidate
        });
    }

    // Sort best matches first
    matches.sort((a, b) => b.similarity - a.similarity);

    // ------------------------------------------------------------------
    // 4. Persist flagged matches to problem_duplicate_matches (upsert)
    // ------------------------------------------------------------------
    for (const match of matches) {
        await pool.query(
            `INSERT INTO problem_duplicate_matches
                 (problem_id, matched_problem_id, similarity_score,
                  classification, signals)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (problem_id, matched_problem_id)
             DO UPDATE SET
                 similarity_score = EXCLUDED.similarity_score,
                 classification   = EXCLUDED.classification,
                 signals          = EXCLUDED.signals`,
            [
                problemId,
                match.problem_id,
                match.similarity,
                match.classification,
                match.signals
            ]
        );
    }

    // ------------------------------------------------------------------
    // 5. Return clean result objects (strip internal _candidate key)
    // ------------------------------------------------------------------
    return matches.map(({ _candidate, ...clean }) => clean);
}

/**
 * Load persisted duplicate matches for a given problem from the DB.
 * Used by the GET /api/problems/:id/duplicates endpoint so it can
 * return previously computed results without re-running detection.
 * Falls back to live detection if no stored matches exist.
 *
 * @param {number} problemId
 * @returns {Promise<Array>}
 */
async function getDuplicatesForProblem(problemId) {
    const stored = await pool.query(
        `SELECT
             dm.matched_problem_id AS problem_id,
             dm.similarity_score   AS similarity,
             dm.classification,
             dm.signals,
             dm.created_at
         FROM problem_duplicate_matches dm
         WHERE dm.problem_id = $1
         ORDER BY dm.similarity_score DESC`,
        [problemId]
    );

    if (stored.rows.length > 0) {
        return stored.rows.map((row) => ({
            problem_id: row.problem_id,
            similarity: parseFloat(row.similarity),
            percentage: Math.round(parseFloat(row.similarity) * 100),
            classification: row.classification,
            signals: row.signals
        }));
    }

    // Nothing stored yet — run live detection
    return findDuplicates(problemId);
}

module.exports = {
    findDuplicates,
    getDuplicatesForProblem
};
