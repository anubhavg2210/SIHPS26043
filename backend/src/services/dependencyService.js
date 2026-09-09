/**
 * dependencyService.js
 *
 * MODULE 12 — PROBLEM DEPENDENCY MAPPING SERVICE
 *
 * Enforces:
 *   Direction:
 *     problem_id = downstream problem (the problem that depends on the other)
 *     depends_on_problem_id = upstream problem (the prerequisite/causal problem)
 *
 *   Cycle Prevention:
 *     - No self-loops (A -> A)
 *     - No direct reverse edges (A -> B when B -> A exists)
 *     - No transitive cycles (A -> B when B transitively depends on A)
 *     - Returns full cycle_path on 409 Conflict.
 *
 *   Deterministic Server Confidence:
 *     - Clients cannot set confidence directly.
 *     - Calculated deterministically from signals (root cause overlap, cluster, geo, keywords).
 *     - Verification status NEVER alters confidence.
 *
 *   Problem Status Independence:
 *     - Never mutates problems.status.
 */

"use strict";

const pool = require("../config/db");

// ---------------------------------------------------------------------------
// Custom Errors
// ---------------------------------------------------------------------------

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValidationError";
    }
}

class ForbiddenError extends Error {
    constructor(message) {
        super(message);
        this.name = "ForbiddenError";
    }
}

class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = "NotFoundError";
    }
}

class ConflictError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = "ConflictError";
        this.details = details;
    }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_DEPENDENCY_TYPES = [
    "BLOCKS_SOLUTION",
    "CAUSES",
    "EXACERBATES",
    "SHARED_ROOT_CAUSE",
    "TEMPORAL_SEQUENCE",
];

const VALID_VERIFICATION_STATUSES = [
    "PROPOSED",
    "UNDER_REVIEW",
    "VERIFIED",
    "REJECTED",
];

const ALLOWED_TRANSITIONS = {
    PROPOSED: ["UNDER_REVIEW"],
    UNDER_REVIEW: ["VERIFIED", "REJECTED"],
    REJECTED: ["UNDER_REVIEW"],
    VERIFIED: ["UNDER_REVIEW"],
};

// Causal connectives indicative of dependency relationships
const CAUSAL_KEYWORDS = [
    "because",
    "caused by",
    "due to",
    "leads to",
    "results in",
    "overflow",
    "culvert",
    "drainage",
    "seepage",
    "contamination",
    "blocks",
    "blocked by",
    "damages",
    "infiltrates",
    "upstream",
    "downstream",
];

// ---------------------------------------------------------------------------
// RBAC & Permission Helpers
// ---------------------------------------------------------------------------

function isAuthorityOrAdmin(user) {
    return user && ["AUTHORITY", "ADMIN"].includes(user.role);
}

function canAnalyze(user) {
    if (!user) return false;
    return ["AUTHORITY", "ADMIN", "RESEARCHER", "UNIVERSITY"].includes(user.role);
}

async function canProposeDependency(user, downstreamProblemId, upstreamProblemId) {
    if (!user) return false;
    if (isAuthorityOrAdmin(user)) return true;
    if (["RESEARCHER", "UNIVERSITY"].includes(user.role)) return true;

    if (user.role === "STUDENT") {
        // Safe Rule: Student must have matching skills or solution link on EITHER problem
        const skillCheck = await pool.query(
            `SELECT 1 FROM student_profiles sp, problems p
             WHERE sp.user_id = $1 AND p.id IN ($2, $3)
               AND sp.skills IS NOT NULL
               AND p.required_expertise IS NOT NULL
               AND sp.skills && p.required_expertise
             LIMIT 1`,
            [user.id, downstreamProblemId, upstreamProblemId]
        );
        if (skillCheck.rows.length > 0) return true;

        const solutionCheck = await pool.query(
            `SELECT 1 FROM solutions s
             LEFT JOIN solution_contributors sc ON sc.solution_id = s.id
             WHERE s.problem_id IN ($1, $2) AND (s.submitted_by = $3 OR sc.user_id = $3)
             LIMIT 1`,
            [downstreamProblemId, upstreamProblemId, user.id]
        );
        return solutionCheck.rows.length > 0;
    }

    if (["STARTUP", "MSME"].includes(user.role)) {
        const teamCheck = await pool.query(
            `SELECT 1 FROM solutions s
             LEFT JOIN solution_contributors sc ON sc.solution_id = s.id
             WHERE s.problem_id IN ($1, $2) AND (s.submitted_by = $3 OR sc.user_id = $3)
             LIMIT 1`,
            [downstreamProblemId, upstreamProblemId, user.id]
        );
        return teamCheck.rows.length > 0;
    }

    // Citizens cannot propose formal dependencies
    return false;
}

function canEditDependency(user, depRow) {
    if (!user || !depRow) return false;
    if (isAuthorityOrAdmin(user)) return true;

    // Ordinary proposers can only edit/delete their own unverified proposed dependencies
    if (["VERIFIED", "REJECTED"].includes(depRow.verification_status)) {
        return false;
    }

    return Number(depRow.created_by) === Number(user.id);
}

// ---------------------------------------------------------------------------
// Cycle Detection Engine
// ---------------------------------------------------------------------------

/**
 * Validates that adding a directed edge (downstreamId -> upstreamId)
 * will not induce a cycle in the dependency graph.
 *
 * Edge semantics: downstreamId depends on upstreamId.
 * If upstreamId already (directly or transitively) depends on downstreamId,
 * there is an existing path: upstreamId -> ... -> downstreamId.
 * Adding downstreamId -> upstreamId closes a directed loop!
 *
 * @param {number} downstreamId - problem_id (the dependent problem)
 * @param {number} upstreamId   - depends_on_problem_id (the prerequisite/causal problem)
 * @param {number|null} excludeDepId - dependency id to ignore during updates
 */
async function assertNoCycle(downstreamId, upstreamId, excludeDepId = null) {
    // 1. Self-dependency check
    if (Number(downstreamId) === Number(upstreamId)) {
        throw new ValidationError("Self-dependency is not permitted: a problem cannot depend on itself");
    }

    // 2. Direct reverse dependency check (upstreamId -> downstreamId)
    const directCheck = await pool.query(
        `SELECT id FROM problem_dependencies
         WHERE problem_id = $1 AND depends_on_problem_id = $2
           AND ($3::int IS NULL OR id <> $3::int)
         LIMIT 1`,
        [upstreamId, downstreamId, excludeDepId]
    );

    if (directCheck.rows.length > 0) {
        throw new ConflictError(
            `Circular dependency detected: Problem ${upstreamId} already directly depends on Problem ${downstreamId}`,
            { cycle_path: [Number(downstreamId), Number(upstreamId), Number(downstreamId)] }
        );
    }

    // 3. Transitive reachability check via Recursive CTE
    // Traverse paths starting from upstreamId to see if downstreamId is reachable
    const transitiveCheck = await pool.query(
        `WITH RECURSIVE dependency_path AS (
            SELECT problem_id, depends_on_problem_id,
                   ARRAY[problem_id::int, depends_on_problem_id::int] AS path
            FROM problem_dependencies
            WHERE problem_id = $1
              AND ($3::int IS NULL OR id <> $3::int)

            UNION ALL

            SELECT pd.problem_id, pd.depends_on_problem_id,
                   dp.path || pd.depends_on_problem_id::int
            FROM problem_dependencies pd
            JOIN dependency_path dp ON pd.problem_id = dp.depends_on_problem_id
            WHERE NOT (pd.depends_on_problem_id = ANY(dp.path))
              AND ($3::int IS NULL OR pd.id <> $3::int)
        )
        SELECT path FROM dependency_path
        WHERE depends_on_problem_id = $2
        LIMIT 1`,
        [upstreamId, downstreamId, excludeDepId]
    );

    if (transitiveCheck.rows.length > 0) {
        const foundPath = transitiveCheck.rows[0].path;
        // The cycle path is [downstreamId, ...foundPath]
        const completeCycle = [Number(downstreamId), ...foundPath];
        throw new ConflictError(
            `Circular dependency detected: Problem ${upstreamId} transitively depends on Problem ${downstreamId}`,
            { cycle_path: completeCycle }
        );
    }
}

// ---------------------------------------------------------------------------
// Deterministic Confidence Calculation
// ---------------------------------------------------------------------------

/**
 * Calculates deterministic server confidence score.
 * Formula:
 *   Root Cause Overlap (0-30)
 * + Cluster & Domain Alignment (0-25)
 * + Geographic Proximity (0-20)
 * + Textual & Causal Keywords (0-25)
 * Total bounded between 10.0 and 95.0.
 *
 * Verification status NEVER modifies confidence!
 */
function calculateDeterministicConfidence({
    downstreamProblem,
    upstreamProblem,
    sharedRootCauses = 0,
    matchedKeywords = [],
}) {
    let score = 0.0;

    // 1. Root Cause Overlap (up to 30 pts)
    const rootCauseScore = Math.min(30.0, sharedRootCauses * 15.0);
    score += rootCauseScore;

    // 2. Cluster & Domain Alignment (up to 25 pts)
    let clusterScore = 0.0;
    if (downstreamProblem.cluster_id && upstreamProblem.cluster_id && downstreamProblem.cluster_id === upstreamProblem.cluster_id) {
        clusterScore += 15.0;
    }
    if (downstreamProblem.category && upstreamProblem.category && downstreamProblem.category.toLowerCase() === upstreamProblem.category.toLowerCase()) {
        clusterScore += 10.0;
    }
    score += clusterScore;

    // 3. Geographic Proximity (up to 20 pts)
    let geoScore = 0.0;
    const sameDistrict = downstreamProblem.district && upstreamProblem.district && downstreamProblem.district.toLowerCase() === upstreamProblem.district.toLowerCase();
    if (sameDistrict) {
        geoScore += 15.0;
        if (downstreamProblem.latitude && downstreamProblem.longitude && upstreamProblem.latitude && upstreamProblem.longitude) {
            const latDiff = Math.abs(Number(downstreamProblem.latitude) - Number(upstreamProblem.latitude));
            const lonDiff = Math.abs(Number(downstreamProblem.longitude) - Number(upstreamProblem.longitude));
            if (latDiff < 0.05 && lonDiff < 0.05) {
                geoScore += 5.0; // Within close vicinity (~5km)
            }
        }
    }
    score += geoScore;

    // 4. Textual & Causal Keywords (up to 25 pts)
    const keywordScore = Math.min(25.0, matchedKeywords.length * 6.0);
    score += keywordScore;

    // Fallback baseline for manual hypotheses
    if (score < 30.0) {
        score = 35.0;
    }

    const confidence = Number(Math.min(95.0, Math.max(10.0, score)).toFixed(2));

    const signals = {
        root_cause_overlap_count: sharedRootCauses,
        root_cause_score: rootCauseScore,
        cluster_aligned: Boolean(downstreamProblem.cluster_id && downstreamProblem.cluster_id === upstreamProblem.cluster_id),
        category_matched: Boolean(downstreamProblem.category && downstreamProblem.category === upstreamProblem.category),
        cluster_score: clusterScore,
        same_district: sameDistrict,
        geo_score: geoScore,
        matched_causal_keywords: matchedKeywords,
        keyword_score: keywordScore,
        calculated_confidence: confidence,
    };

    return { confidence, signals };
}

// ---------------------------------------------------------------------------
// 1. AI-ASSISTED DEPENDENCY DETECTION
// ---------------------------------------------------------------------------

async function detectDependencies(problemId, user) {
    if (!canAnalyze(user)) {
        throw new ForbiddenError("You do not have permission to trigger AI dependency detection");
    }

    const probRes = await pool.query(
        "SELECT * FROM problems WHERE id = $1",
        [problemId]
    );
    if (probRes.rows.length === 0) {
        throw new NotFoundError("Problem not found");
    }

    const currentProblem = probRes.rows[0];
    const currentText = `${currentProblem.title || ""} ${currentProblem.description || ""}`.toLowerCase();

    // Find candidate problems in same district, same cluster, or complementary category
    const candidatesRes = await pool.query(
        `SELECT * FROM problems
         WHERE id <> $1
           AND (district = $2 OR cluster_id = $3 OR category = $4)
         LIMIT 20`,
        [problemId, currentProblem.district, currentProblem.cluster_id || -1, currentProblem.category]
    );

    const generatedDependencies = [];

    for (const candidate of candidatesRes.rows) {
        // Evaluate candidate as upstream (currentProblem depends on candidate)
        const downstream = currentProblem;
        const upstream = candidate;

        // Skip if edge already exists
        const existingCheck = await pool.query(
            "SELECT id FROM problem_dependencies WHERE problem_id = $1 AND depends_on_problem_id = $2",
            [downstream.id, upstream.id]
        );
        if (existingCheck.rows.length > 0) continue;

        // Test cycle safety: if adding downstream -> upstream creates a cycle, skip candidate
        try {
            await assertNoCycle(downstream.id, upstream.id);
        } catch (cycleErr) {
            continue; // Skip cycle-inducing candidate
        }

        // Check shared root causes
        const rcCheck = await pool.query(
            `SELECT COUNT(*)::int AS count
             FROM root_causes r1
             JOIN root_causes r2 ON LOWER(TRIM(r1.cause)) = LOWER(TRIM(r2.cause))
             WHERE r1.problem_id = $1 AND r2.problem_id = $2`,
            [downstream.id, upstream.id]
        );
        const sharedRootCauses = rcCheck.rows[0]?.count || 0;

        // Keyword matches
        const candidateText = `${candidate.title || ""} ${candidate.description || ""}`.toLowerCase();
        const matchedKeywords = CAUSAL_KEYWORDS.filter(
            (kw) => currentText.includes(kw) || candidateText.includes(kw)
        );

        const { confidence, signals } = calculateDeterministicConfidence({
            downstreamProblem: downstream,
            upstreamProblem: upstream,
            sharedRootCauses,
            matchedKeywords,
        });

        // Threshold: Only suggest candidates with confidence >= 50.0
        if (confidence >= 50.0) {
            const depType = (currentProblem.category === candidate.category)
                ? "SHARED_ROOT_CAUSE"
                : "BLOCKS_SOLUTION";

            const reasoning = `AI detected causal and operational linkage (${signals.matched_causal_keywords.length} causal signals, district: ${upstream.district}).`;

            const insertRes = await pool.query(
                `INSERT INTO problem_dependencies
                    (problem_id, depends_on_problem_id, dependency_type, confidence,
                     source_type, verification_status, reasoning, signals, created_by)
                 VALUES ($1, $2, $3, $4, 'AI', 'PROPOSED', $5, $6, $7)
                 ON CONFLICT (problem_id, depends_on_problem_id)
                 DO UPDATE SET
                    confidence = EXCLUDED.confidence,
                    signals = EXCLUDED.signals,
                    reasoning = EXCLUDED.reasoning,
                    updated_at = CURRENT_TIMESTAMP
                 RETURNING *`,
                [downstream.id, upstream.id, depType, confidence, reasoning, JSON.stringify(signals), user.id]
            );

            if (insertRes.rows.length > 0) {
                generatedDependencies.push(await getDependencyById(insertRes.rows[0].id));
            }
        }
    }

    return generatedDependencies;
}

// ---------------------------------------------------------------------------
// 2. CREATE / PROPOSE DEPENDENCY (MANUAL)
// ---------------------------------------------------------------------------

async function createDependency({ problemId, user, payload }) {
    if (!payload || typeof payload !== "object") {
        throw new ValidationError("Payload must be an object");
    }

    const downstreamId = parseInt(problemId, 10);
    const upstreamId = parseInt(payload.depends_on_problem_id, 10);

    if (isNaN(downstreamId) || isNaN(upstreamId)) {
        throw new ValidationError('"depends_on_problem_id" is required and must be a valid problem ID');
    }

    if (Number(downstreamId) === Number(upstreamId)) {
        throw new ValidationError("Self-dependency is not permitted: a problem cannot depend on itself");
    }

    // Verify both problems exist
    const pCheck = await pool.query(
        "SELECT id, title, category, subcategory, district, cluster_id, latitude, longitude, required_expertise FROM problems WHERE id IN ($1, $2)",
        [downstreamId, upstreamId]
    );

    if (pCheck.rows.length < 2) {
        throw new NotFoundError("One or both problems specified in the dependency do not exist");
    }

    const downstreamProblem = pCheck.rows.find((p) => p.id === downstreamId);
    const upstreamProblem = pCheck.rows.find((p) => p.id === upstreamId);

    // Permission check
    const authorized = await canProposeDependency(user, downstreamId, upstreamId);
    if (!authorized) {
        throw new ForbiddenError("You are not authorized to propose a dependency between these problems");
    }

    // Cycle & Self-dependency assertion
    await assertNoCycle(downstreamId, upstreamId);

    // Dependency type validation
    const depType = payload.dependency_type
        ? String(payload.dependency_type).trim().toUpperCase()
        : "BLOCKS_SOLUTION";

    if (!VALID_DEPENDENCY_TYPES.includes(depType)) {
        throw new ValidationError(`"dependency_type" must be one of: ${VALID_DEPENDENCY_TYPES.join(", ")}`);
    }

    // Check duplicate
    const dupCheck = await pool.query(
        "SELECT id FROM problem_dependencies WHERE problem_id = $1 AND depends_on_problem_id = $2",
        [downstreamId, upstreamId]
    );
    if (dupCheck.rows.length > 0) {
        throw new ConflictError("This dependency has already been created between these problems");
    }

    // Check shared root causes
    const rcCheck = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM root_causes r1
         JOIN root_causes r2 ON LOWER(TRIM(r1.cause)) = LOWER(TRIM(r2.cause))
         WHERE r1.problem_id = $1 AND r2.problem_id = $2`,
        [downstreamId, upstreamId]
    );
    const sharedRootCauses = rcCheck.rows[0]?.count || 0;

    // Keyword analysis
    const combinedText = `${downstreamProblem.title} ${upstreamProblem.title}`.toLowerCase();
    const matchedKeywords = CAUSAL_KEYWORDS.filter((kw) => combinedText.includes(kw));

    // Calculate deterministic confidence
    const { confidence, signals } = calculateDeterministicConfidence({
        downstreamProblem,
        upstreamProblem,
        sharedRootCauses,
        matchedKeywords,
    });

    const sourceType = isAuthorityOrAdmin(user)
        ? "AUTHORITY"
        : user.role === "STUDENT"
        ? "STUDENT"
        : user.role === "RESEARCHER" || user.role === "UNIVERSITY"
        ? "RESEARCHER"
        : "HUMAN";

    const reasoning = payload.reasoning
        ? String(payload.reasoning).trim()
        : `Dependency proposed by ${user.role}`;

    try {
        const insertRes = await pool.query(
            `INSERT INTO problem_dependencies
                (problem_id, depends_on_problem_id, dependency_type, confidence,
                 source_type, verification_status, reasoning, signals, created_by)
             VALUES ($1, $2, $3, $4, $5, 'PROPOSED', $6, $7, $8)
             RETURNING *`,
            [
                downstreamId,
                upstreamId,
                depType,
                confidence,
                sourceType,
                reasoning,
                JSON.stringify(signals),
                user.id,
            ]
        );

        return await getDependencyById(insertRes.rows[0].id);
    } catch (err) {
        if (err.code === "23505") {
            throw new ConflictError("This dependency has already been created between these problems");
        }
        if (err.code === "23514") {
            throw new ValidationError("Constraint check failure: invalid dependency data");
        }
        throw err;
    }
}

// ---------------------------------------------------------------------------
// 3. GET DEPENDENCIES FOR A PROBLEM
// ---------------------------------------------------------------------------

async function getProblemDependencies(problemId) {
    const probCheck = await pool.query("SELECT id FROM problems WHERE id = $1", [problemId]);
    if (probCheck.rows.length === 0) {
        throw new NotFoundError("Problem not found");
    }

    // Upstream dependencies: What does this problem depend on? (problem_id = problemId)
    const upstreamRes = await pool.query(
        `SELECT pd.*,
                p.title AS upstream_title, p.category AS upstream_category, p.status AS upstream_status,
                u.name AS proposer_name, u.role AS proposer_role,
                v.name AS verifier_name, v.role AS verifier_role
         FROM problem_dependencies pd
         JOIN problems p ON p.id = pd.depends_on_problem_id
         LEFT JOIN users u ON u.id = pd.created_by
         LEFT JOIN users v ON v.id = pd.verified_by
         WHERE pd.problem_id = $1
         ORDER BY pd.confidence DESC, pd.created_at DESC`,
        [problemId]
    );

    // Downstream dependencies: What problems depend on this problem? (depends_on_problem_id = problemId)
    const downstreamRes = await pool.query(
        `SELECT pd.*,
                p.title AS downstream_title, p.category AS downstream_category, p.status AS downstream_status,
                u.name AS proposer_name, u.role AS proposer_role,
                v.name AS verifier_name, v.role AS verifier_role
         FROM problem_dependencies pd
         JOIN problems p ON p.id = pd.problem_id
         LEFT JOIN users u ON u.id = pd.created_by
         LEFT JOIN users v ON v.id = pd.verified_by
         WHERE pd.depends_on_problem_id = $1
         ORDER BY pd.confidence DESC, pd.created_at DESC`,
        [problemId]
    );

    return {
        problem_id: Number(problemId),
        upstream_dependencies: upstreamRes.rows.map(formatDependency),
        downstream_dependencies: downstreamRes.rows.map(formatDependency),
        upstream_count: upstreamRes.rows.length,
        downstream_count: downstreamRes.rows.length,
    };
}

// ---------------------------------------------------------------------------
// 4. GET DEPENDENCY BY ID
// ---------------------------------------------------------------------------

async function getDependencyById(id) {
    const res = await pool.query(
        `SELECT pd.*,
                dp.title AS downstream_title, dp.category AS downstream_category, dp.status AS downstream_status,
                up.title AS upstream_title, up.category AS upstream_category, up.status AS upstream_status,
                u.name AS proposer_name, u.role AS proposer_role,
                v.name AS verifier_name, v.role AS verifier_role
         FROM problem_dependencies pd
         JOIN problems dp ON dp.id = pd.problem_id
         JOIN problems up ON up.id = pd.depends_on_problem_id
         LEFT JOIN users u ON u.id = pd.created_by
         LEFT JOIN users v ON v.id = pd.verified_by
         WHERE pd.id = $1`,
        [id]
    );

    if (res.rows.length === 0) {
        throw new NotFoundError("Dependency record not found");
    }

    return formatDependency(res.rows[0]);
}

// ---------------------------------------------------------------------------
// 5. UPDATE DEPENDENCY
// ---------------------------------------------------------------------------

async function updateDependency({ id, user, payload }) {
    const depRes = await pool.query("SELECT * FROM problem_dependencies WHERE id = $1", [id]);
    if (depRes.rows.length === 0) {
        throw new NotFoundError("Dependency record not found");
    }

    const current = depRes.rows[0];

    if (!canEditDependency(user, current)) {
        throw new ForbiddenError("You are not authorized to edit this dependency");
    }

    if (!payload || typeof payload !== "object") {
        throw new ValidationError("Payload must be an object");
    }

    let depType = current.dependency_type;
    if (payload.dependency_type !== undefined) {
        depType = String(payload.dependency_type).trim().toUpperCase();
        if (!VALID_DEPENDENCY_TYPES.includes(depType)) {
            throw new ValidationError(`"dependency_type" must be one of: ${VALID_DEPENDENCY_TYPES.join(", ")}`);
        }
    }

    let reasoning = current.reasoning;
    if (payload.reasoning !== undefined) {
        reasoning = String(payload.reasoning).trim();
    }

    // Re-verify problems and recalculate confidence if reasoning updated
    const pCheck = await pool.query(
        "SELECT id, title, category, subcategory, district, cluster_id, latitude, longitude FROM problems WHERE id IN ($1, $2)",
        [current.problem_id, current.depends_on_problem_id]
    );
    const downstreamProblem = pCheck.rows.find((p) => p.id === current.problem_id);
    const upstreamProblem = pCheck.rows.find((p) => p.id === current.depends_on_problem_id);

    const { confidence, signals } = calculateDeterministicConfidence({
        downstreamProblem,
        upstreamProblem,
        sharedRootCauses: current.signals?.root_cause_overlap_count || 0,
        matchedKeywords: current.signals?.matched_causal_keywords || [],
    });

    await pool.query(
        `UPDATE problem_dependencies
         SET dependency_type = $1, reasoning = $2, confidence = $3, signals = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [depType, reasoning, confidence, JSON.stringify(signals), id]
    );

    return await getDependencyById(id);
}

// ---------------------------------------------------------------------------
// 6. DELETE DEPENDENCY
// ---------------------------------------------------------------------------

async function deleteDependency({ id, user }) {
    const depRes = await pool.query("SELECT * FROM problem_dependencies WHERE id = $1", [id]);
    if (depRes.rows.length === 0) {
        throw new NotFoundError("Dependency record not found");
    }

    const current = depRes.rows[0];

    if (!canEditDependency(user, current)) {
        throw new ForbiddenError("You are not authorized to delete this dependency");
    }

    await pool.query("DELETE FROM problem_dependencies WHERE id = $1", [id]);

    return {
        message: "Dependency successfully deleted",
        id: Number(id),
        problem_id: current.problem_id,
        depends_on_problem_id: current.depends_on_problem_id,
    };
}

// ---------------------------------------------------------------------------
// 7. VERIFICATION LIFECYCLE (FIX 1: Strictly isolated from confidence)
// ---------------------------------------------------------------------------

async function verifyDependency({ id, user, payload }) {
    if (!isAuthorityOrAdmin(user)) {
        throw new ForbiddenError("Only authorities and administrators can verify or reject dependencies");
    }

    if (!payload || !payload.verification_status) {
        throw new ValidationError('"verification_status" is required');
    }

    const nextStatus = String(payload.verification_status).trim().toUpperCase();
    if (!VALID_VERIFICATION_STATUSES.includes(nextStatus)) {
        throw new ValidationError(`"verification_status" must be one of: ${VALID_VERIFICATION_STATUSES.join(", ")}`);
    }

    const depRes = await pool.query("SELECT * FROM problem_dependencies WHERE id = $1", [id]);
    if (depRes.rows.length === 0) {
        throw new NotFoundError("Dependency record not found");
    }

    const current = depRes.rows[0];
    const currentStatus = current.verification_status;

    // Check transition rules
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(nextStatus)) {
        throw new ValidationError(`Invalid verification transition: cannot transition from ${currentStatus} to ${nextStatus}`);
    }

    if (!payload.verification_notes || typeof payload.verification_notes !== "string" || !payload.verification_notes.trim()) {
        throw new ValidationError('"verification_notes" are mandatory when updating verification status');
    }

    // CRITICAL: Confidence is NEVER modified by verification!
    const verifiedAt = nextStatus === "VERIFIED" ? new Date() : null;

    const res = await pool.query(
        `UPDATE problem_dependencies
         SET verification_status = $1,
             verified_by = $2,
             verified_at = $3,
             verification_notes = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [nextStatus, user.id, verifiedAt, payload.verification_notes.trim(), id]
    );

    return await getDependencyById(id);
}

// ---------------------------------------------------------------------------
// 8. GRAPH TRAVERSAL (MULTI-LEVEL DAG)
// ---------------------------------------------------------------------------

async function getDependencyGraph(problemId, maxDepth = 2) {
    const depth = Math.min(5, Math.max(1, parseInt(maxDepth, 10) || 2));

    const probCheck = await pool.query("SELECT id, title, category, status FROM problems WHERE id = $1", [problemId]);
    if (probCheck.rows.length === 0) {
        throw new NotFoundError("Problem not found");
    }

    // Traverse upstream and downstream graph edges recursively up to depth
    const graphRes = await pool.query(
        `WITH RECURSIVE graph_nodes AS (
            SELECT $1::int AS problem_id, 0 AS depth, ARRAY[$1::int] AS visited
            UNION ALL
            SELECT l.next_id, gn.depth + 1, gn.visited || l.next_id
            FROM graph_nodes gn
            JOIN LATERAL (
                SELECT pd.depends_on_problem_id AS next_id FROM problem_dependencies pd WHERE pd.problem_id = gn.problem_id
                UNION
                SELECT pd.problem_id AS next_id FROM problem_dependencies pd WHERE pd.depends_on_problem_id = gn.problem_id
            ) l ON true
            WHERE gn.depth < $2::int AND NOT (l.next_id = ANY(gn.visited))
        )
        SELECT DISTINCT p.id, p.title, p.category, p.status, p.district, p.affected_people
        FROM problems p
        JOIN graph_nodes gn ON gn.problem_id = p.id`,
        [problemId, depth]
    );

    const nodeIds = graphRes.rows.map((r) => r.id);

    // Get all edges between these visited nodes
    const edgeRes = await pool.query(
        `SELECT pd.id, pd.problem_id, pd.depends_on_problem_id, pd.dependency_type,
                pd.confidence, pd.verification_status
         FROM problem_dependencies pd
         WHERE pd.problem_id = ANY($1::int[]) AND pd.depends_on_problem_id = ANY($1::int[])`,
        [nodeIds]
    );

    return {
        root_problem_id: Number(problemId),
        depth,
        nodes: graphRes.rows.map((n) => ({
            id: n.id,
            title: n.title,
            category: n.category,
            status: n.status,
            district: n.district,
            affected_people: n.affected_people,
        })),
        edges: edgeRes.rows.map((e) => ({
            id: e.id,
            from: e.problem_id, // Downstream dependent
            to: e.depends_on_problem_id, // Upstream prerequisite
            dependency_type: e.dependency_type,
            confidence: Number(e.confidence),
            verification_status: e.verification_status,
        })),
    };
}

// ---------------------------------------------------------------------------
// 9. IMPACT CHAIN (BLAST RADIUS CASCADE ANALYSIS)
// ---------------------------------------------------------------------------

async function getImpactChain(problemId) {
    const probCheck = await pool.query("SELECT id, title, affected_people, status FROM problems WHERE id = $1", [problemId]);
    if (probCheck.rows.length === 0) {
        throw new NotFoundError("Problem not found");
    }

    const rootProblem = probCheck.rows[0];

    // Downstream cascade: Find all problems that depend directly or transitively on this problem
    const cascadeRes = await pool.query(
        `WITH RECURSIVE downstream_cascade AS (
            -- Direct dependents
            SELECT pd.problem_id, pd.depends_on_problem_id, pd.dependency_type,
                   ARRAY[pd.depends_on_problem_id::int, pd.problem_id::int] AS path,
                   1 AS level
            FROM problem_dependencies pd
            WHERE pd.depends_on_problem_id = $1

            UNION ALL

            -- Transitive dependents
            SELECT pd.problem_id, pd.depends_on_problem_id, pd.dependency_type,
                   dc.path || pd.problem_id::int,
                   dc.level + 1
            FROM problem_dependencies pd
            JOIN downstream_cascade dc ON pd.depends_on_problem_id = dc.problem_id
            WHERE NOT (pd.problem_id = ANY(dc.path)) AND dc.level < 10
        )
        SELECT dc.problem_id, dc.dependency_type, dc.path, dc.level,
               p.title, p.category, p.status, p.affected_people
        FROM downstream_cascade dc
        JOIN problems p ON p.id = dc.problem_id
        ORDER BY dc.level ASC`,
        [problemId]
    );

    const affectedProblemIds = Array.from(new Set(cascadeRes.rows.map((r) => r.problem_id)));

    // Count blocked solutions on these downstream problems
    let blockedSolutionsCount = 0;
    if (affectedProblemIds.length > 0) {
        const solRes = await pool.query(
            "SELECT COUNT(*)::int AS count FROM solutions WHERE problem_id = ANY($1::int[])",
            [affectedProblemIds]
        );
        blockedSolutionsCount = solRes.rows[0]?.count || 0;
    }

    // Cumulative affected population (root problem + downstream problems)
    const downstreamPeopleSum = cascadeRes.rows.reduce(
        (sum, r) => sum + (Number(r.affected_people) || 0),
        0
    );
    const totalAffectedPopulation = (Number(rootProblem.affected_people) || 0) + downstreamPeopleSum;

    return {
        root_problem_id: Number(problemId),
        root_problem_title: rootProblem.title,
        blast_radius_count: affectedProblemIds.length,
        total_affected_population: totalAffectedPopulation,
        blocked_solutions_count: blockedSolutionsCount,
        downstream_problems: cascadeRes.rows.map((r) => ({
            id: r.problem_id,
            title: r.title,
            category: r.category,
            status: r.status,
            dependency_type: r.dependency_type,
            cascade_level: r.level,
            cascade_path: r.path,
            affected_people: r.affected_people,
        })),
    };
}

// ---------------------------------------------------------------------------
// 10. CRITICAL PATHS / BOTTLENECK ANALYSIS
// ---------------------------------------------------------------------------

async function getCriticalPaths(filterDistrict = null) {
    const params = [];
    let whereClause = "";
    if (filterDistrict && typeof filterDistrict === "string" && filterDistrict.trim()) {
        params.push(filterDistrict.trim());
        whereClause = `AND p.district = $${params.length}`;
    }

    // Identifies root bottleneck problems (highest blocking in-degree)
    const res = await pool.query(
        `SELECT p.id, p.title, p.category, p.district, p.status, p.affected_people,
                COUNT(pd.id)::int AS blocking_degree,
                COUNT(DISTINCT pd.problem_id)::int AS blocked_problems_count,
                ARRAY_AGG(DISTINCT pd.problem_id) AS blocked_problem_ids
         FROM problems p
         JOIN problem_dependencies pd ON pd.depends_on_problem_id = p.id
         WHERE pd.dependency_type IN ('BLOCKS_SOLUTION', 'CAUSES')
           ${whereClause}
         GROUP BY p.id, p.title, p.category, p.district, p.status, p.affected_people
         ORDER BY blocking_degree DESC, p.affected_people DESC
         LIMIT 20`,
        params
    );

    return {
        total_bottlenecks: res.rows.length,
        district_filter: filterDistrict || null,
        bottlenecks: res.rows.map((r) => ({
            problem_id: r.id,
            title: r.title,
            category: r.category,
            district: r.district,
            status: r.status,
            affected_people: r.affected_people,
            blocking_degree: r.blocking_degree,
            blocked_problems_count: r.blocked_problems_count,
            blocked_problem_ids: r.blocked_problem_ids,
        })),
    };
}

// ---------------------------------------------------------------------------
// Formatter Helper
// ---------------------------------------------------------------------------

function formatDependency(row) {
    if (!row) return null;

    const proposer = row.proposer_name
        ? { id: row.created_by, name: row.proposer_name, role: row.proposer_role }
        : row.created_by
        ? { id: row.created_by }
        : null;

    const verifier = row.verifier_name
        ? { id: row.verified_by, name: row.verifier_name, role: row.verifier_role }
        : row.verified_by
        ? { id: row.verified_by }
        : null;

    return {
        id: row.id,
        problem_id: row.problem_id, // Downstream
        depends_on_problem_id: row.depends_on_problem_id, // Upstream
        dependency_type: row.dependency_type,
        confidence: Number(row.confidence),
        source_type: row.source_type,
        verification_status: row.verification_status,
        reasoning: row.reasoning,
        signals: row.signals,
        created_at: row.created_at,
        updated_at: row.updated_at,
        downstream: row.downstream_title
            ? { id: row.problem_id, title: row.downstream_title, category: row.downstream_category, status: row.downstream_status }
            : { id: row.problem_id },
        upstream: row.upstream_title
            ? { id: row.depends_on_problem_id, title: row.upstream_title, category: row.upstream_category, status: row.upstream_status }
            : { id: row.depends_on_problem_id },
        proposer,
        verifier,
        verified_at: row.verified_at,
        verification_notes: row.verification_notes,
    };
}

module.exports = {
    ValidationError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    assertNoCycle,
    calculateDeterministicConfidence,
    detectDependencies,
    createDependency,
    getProblemDependencies,
    getDependencyById,
    updateDependency,
    deleteDependency,
    verifyDependency,
    getDependencyGraph,
    getImpactChain,
    getCriticalPaths,
    formatDependency,
};
