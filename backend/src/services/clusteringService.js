/**
 * clusteringService.js
 *
 * MODULE 2 — PROBLEM CLUSTERING
 *
 * PURPOSE:
 *   Distinct from duplicate detection (Module 1). Clustering answers:
 *   "Are multiple related reports symptoms of a larger societal issue?"
 *
 *   Two problems from different districts using different words can still
 *   belong to the same societal cluster (e.g., groundwater contamination).
 *
 * SCORING WEIGHTS:
 *   category      -> 30%
 *   subcategory   -> 25%
 *   keyword overlap -> 25%
 *   district      -> 10%   (supporting signal only — NOT a hard filter)
 *   text similarity -> 10%
 *                     ---
 *                     100%
 *
 * CLUSTER THRESHOLD:
 *   >= 0.60  -> RELATED_TO_CLUSTER (join or create a cluster)
 *   <  0.60  -> no cluster assignment
 *
 * NOTE: These thresholds are independent of Module 1 duplicate thresholds.
 *
 * CLUSTER ASSIGNMENT LOGIC:
 *   Step 1 — Find related problems (score >= 0.60).
 *   Step 2 — If any related problem already has a cluster → join that cluster.
 *   Step 3 — Else if >= 2 related problems exist but none has a cluster
 *             → create a new cluster and assign all of them.
 *   Step 4 — Else → leave cluster_id NULL.
 */

"use strict";

const pool = require("../config/db");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEIGHTS = {
    category: 0.30,
    subcategory: 0.25,
    keywords: 0.25,
    district: 0.10,
    text: 0.10
};

// A problem must score at least this to be considered cluster-related.
const CLUSTER_THRESHOLD = 0.60;

// Minimum number of co-related problems (including the new one) to create
// a brand-new cluster from scratch (when none of them already has a cluster).
const MIN_PROBLEMS_FOR_NEW_CLUSTER = 2;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute Jaccard-style keyword overlap between two keyword arrays.
 * Returns a value in [0, 1].
 *
 * Both arrays are normalised (lowercase, trimmed) before comparison.
 * Returns 0 if either array is empty.
 *
 * @param {string[]} kA
 * @param {string[]} kB
 * @returns {number}
 */
function keywordOverlap(kA, kB) {
    if (!Array.isArray(kA) || !Array.isArray(kB)) return 0;

    const normalize = (arr) =>
        new Set(
            arr
                .map((k) => (typeof k === "string" ? k.toLowerCase().trim() : ""))
                .filter(Boolean)
        );

    const setA = normalize(kA);
    const setB = normalize(kB);

    if (setA.size === 0 || setB.size === 0) return 0;

    let intersection = 0;

    for (const kw of setA) {
        if (setB.has(kw)) intersection++;
    }

    // Union size
    const union = setA.size + setB.size - intersection;

    return union === 0 ? 0 : intersection / union;
}

/**
 * Generate a deterministic human-readable cluster name from a problem.
 *
 * @param {object} problem - problem row with category and subcategory
 * @returns {string}
 */
function buildClusterName(problem) {
    const cat = (problem.category || "").trim();
    const sub = (problem.subcategory || "").trim();

    if (sub && cat) return `${sub} — ${cat}`;
    if (cat) return `${cat} Societal Problem Cluster`;
    return "General Societal Problem Cluster";
}

/**
 * Compute the clustering relevance score between the target problem and a
 * candidate row (already enriched with title_sim from the SQL query).
 *
 * @param {object} problem   - the target problem
 * @param {object} candidate - a candidate row from the DB
 * @returns {number} score in [0, 1]
 */
function computeScore(problem, candidate) {
    // --- category (30%) ---
    const categorySim =
        problem.category &&
        candidate.category &&
        problem.category.toLowerCase() === candidate.category.toLowerCase()
            ? 1
            : 0;

    // --- subcategory (25%) ---
    const subcategorySim =
        problem.subcategory &&
        candidate.subcategory &&
        problem.subcategory.toLowerCase() === candidate.subcategory.toLowerCase()
            ? 1
            : 0;

    // --- keyword overlap (25%) ---
    const kwSim = keywordOverlap(
        problem.ai_keywords || [],
        candidate.ai_keywords || []
    );

    // --- district (10%) ---
    const districtSim =
        problem.district &&
        candidate.district &&
        problem.district.toLowerCase() === candidate.district.toLowerCase()
            ? 1
            : 0;

    // --- text similarity (10%) — already computed by pg_trgm in SQL ---
    const textSim = parseFloat(candidate.text_sim) || 0;

    return (
        categorySim * WEIGHTS.category +
        subcategorySim * WEIGHTS.subcategory +
        kwSim * WEIGHTS.keywords +
        districtSim * WEIGHTS.district +
        textSim * WEIGHTS.text
    );
}

// ---------------------------------------------------------------------------
// Cluster metadata helpers
// ---------------------------------------------------------------------------

/**
 * Recount and update the report_count and severity on a cluster from the
 * actual set of problems assigned to it. Prefer a live count over blind
 * increments to keep data correct.
 *
 * @param {number} clusterId
 * @param {object} [client] - optional pg client for transaction reuse
 */
async function refreshClusterMetadata(clusterId, client) {
    const db = client || pool;

    await db.query(
        `UPDATE problem_clusters
         SET
             report_count = (
                 SELECT COUNT(*)
                 FROM problems
                 WHERE cluster_id = $1
             ),
             severity = (
                 SELECT MAX(severity)
                 FROM problems
                 WHERE cluster_id = $1
             )
         WHERE id = $1`,
        [clusterId]
    );
}

// ---------------------------------------------------------------------------
// Core clustering function
// ---------------------------------------------------------------------------

/**
 * Assign a problem to an appropriate cluster (existing or new).
 *
 * @param {number} problemId
 * @returns {Promise<object>} clustering result
 */
async function clusterProblem(problemId) {
    // ------------------------------------------------------------------
    // 1. Load the target problem
    // ------------------------------------------------------------------
    const targetResult = await pool.query(
        `SELECT
             id, title, description, category, subcategory,
             district, severity, ai_keywords, cluster_id
         FROM problems
         WHERE id = $1`,
        [problemId]
    );

    if (targetResult.rows.length === 0) {
        throw new Error(`Problem with id ${problemId} not found`);
    }

    const problem = targetResult.rows[0];

    // ------------------------------------------------------------------
    // 2. Find candidate problems using a broad pre-filter.
    //    Pre-filter: category match OR pg_trgm title similarity >= 0.15.
    //    District is deliberately NOT a hard filter.
    //    Self is excluded via p.id <> $1.
    // ------------------------------------------------------------------
    const safeTitle = (problem.title || "").trim();
    const safeDesc = (problem.description || "").trim();

    const candidateResult = await pool.query(
        `SELECT
             p.id,
             p.title,
             p.description,
             p.category,
             p.subcategory,
             p.district,
             p.severity,
             p.priority_score,
             p.status,
             p.ai_keywords,
             p.cluster_id,
             p.created_at,
             -- Combined title+description text similarity (10% weight)
             GREATEST(
                 similarity($2, p.title),
                 similarity($3, p.description)
             ) AS text_sim
         FROM problems p
         WHERE
             p.id <> $1
             AND (
                 -- Category match is the strongest pre-filter signal
                 (p.category IS NOT NULL AND LOWER(p.category) = LOWER($4))
                 OR similarity($2, p.title) >= 0.15
                 OR similarity($3, p.description) >= 0.15
             )`,
        [
            problemId,
            safeTitle,
            safeDesc,
            problem.category || ""
        ]
    );

    if (candidateResult.rows.length === 0) {
        return {
            cluster_id: null,
            action: "NO_CLUSTER",
            reason: "No related problems found",
            score: 0
        };
    }

    // ------------------------------------------------------------------
    // 3. Score each candidate
    // ------------------------------------------------------------------
    const scored = [];

    for (const candidate of candidateResult.rows) {
        const score = computeScore(problem, candidate);

        if (score >= CLUSTER_THRESHOLD) {
            scored.push({
                problem_id: candidate.id,
                cluster_id: candidate.cluster_id,
                score: parseFloat(score.toFixed(4)),
                candidate
            });
        }
    }

    if (scored.length === 0) {
        return {
            cluster_id: null,
            action: "NO_CLUSTER",
            reason: `No problems met the clustering threshold of ${CLUSTER_THRESHOLD}`,
            score: 0
        };
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // ------------------------------------------------------------------
    // 4. Decide: join existing cluster vs. create new cluster
    // ------------------------------------------------------------------

    // Step 2: If any related problem already has a cluster, join it.
    const withCluster = scored.filter((s) => s.cluster_id !== null);

    let targetClusterId = null;
    let action = "";

    if (withCluster.length > 0) {
        // Join the cluster of the highest-scoring already-clustered problem.
        targetClusterId = withCluster[0].cluster_id;
        action = "JOINED_EXISTING_CLUSTER";
    } else if (scored.length >= MIN_PROBLEMS_FOR_NEW_CLUSTER) {
        // Step 3: Enough related problems but none has a cluster → create one.
        const clusterName = buildClusterName(problem);

        // Use the district of the target problem as the cluster's primary
        // district (informational only — multiple districts can share a cluster).
        const clusterResult = await pool.query(
            `INSERT INTO problem_clusters
                 (cluster_name, category, district, severity, report_count)
             VALUES ($1, $2, $3, $4, 0)
             RETURNING id`,
            [
                clusterName,
                problem.category || null,
                problem.district || null,
                problem.severity || null
            ]
        );

        targetClusterId = clusterResult.rows[0].id;
        action = "CREATED_NEW_CLUSTER";

        // Assign all related problems that were previously unclustered
        // into this new cluster.
        const relatedIds = scored
            .filter((s) => s.cluster_id === null)
            .map((s) => s.problem_id);

        if (relatedIds.length > 0) {
            await pool.query(
                `UPDATE problems
                 SET cluster_id = $1,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ANY($2::int[])`,
                [targetClusterId, relatedIds]
            );
        }
    } else {
        // Step 4: Only 1 related problem but it has no cluster — not enough
        // to justify a new cluster yet.
        return {
            cluster_id: null,
            action: "NO_CLUSTER",
            reason: "Only one weakly related problem found — not enough to form a cluster",
            score: scored[0].score
        };
    }

    // ------------------------------------------------------------------
    // 5. Assign the target problem to the chosen cluster
    // ------------------------------------------------------------------
    await pool.query(
        `UPDATE problems
         SET cluster_id = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [targetClusterId, problemId]
    );

    // ------------------------------------------------------------------
    // 6. Refresh cluster metadata (recounts from DB, avoids stale data)
    // ------------------------------------------------------------------
    await refreshClusterMetadata(targetClusterId);

    // ------------------------------------------------------------------
    // 7. Load the final cluster row to return
    // ------------------------------------------------------------------
    const clusterResult = await pool.query(
        `SELECT id, cluster_name, category, district, severity, report_count, created_at
         FROM problem_clusters
         WHERE id = $1`,
        [targetClusterId]
    );

    const cluster = clusterResult.rows[0];

    return {
        cluster_id: targetClusterId,
        action,
        cluster,
        top_related: scored.slice(0, 5).map((s) => ({
            problem_id: s.problem_id,
            score: s.score
        }))
    };
}

/**
 * Retrieve the cluster for a given problem along with cluster metadata.
 * Returns null if the problem has no cluster assigned.
 *
 * @param {number} problemId
 * @returns {Promise<object|null>}
 */
async function getClusterForProblem(problemId) {
    const result = await pool.query(
        `SELECT
             pc.id,
             pc.cluster_name,
             pc.category,
             pc.district,
             pc.severity,
             pc.report_count,
             pc.created_at
         FROM problems p
         JOIN problem_clusters pc ON pc.id = p.cluster_id
         WHERE p.id = $1`,
        [problemId]
    );

    if (result.rows.length === 0) return null;

    return result.rows[0];
}

/**
 * Retrieve a cluster by its own id, including its member problems.
 *
 * @param {number} clusterId
 * @returns {Promise<object|null>}
 */
async function getClusterById(clusterId) {
    const clusterResult = await pool.query(
        `SELECT id, cluster_name, category, district, severity, report_count, created_at
         FROM problem_clusters
         WHERE id = $1`,
        [clusterId]
    );

    if (clusterResult.rows.length === 0) return null;

    const cluster = clusterResult.rows[0];

    const problemsResult = await pool.query(
        `SELECT
             id,
             title,
             district,
             severity,
             priority_score,
             status,
             created_at
         FROM problems
         WHERE cluster_id = $1
         ORDER BY priority_score DESC, severity DESC, created_at DESC`,
        [clusterId]
    );

    return {
        cluster,
        problems: problemsResult.rows
    };
}

module.exports = {
    clusterProblem,
    getClusterForProblem,
    getClusterById
};
