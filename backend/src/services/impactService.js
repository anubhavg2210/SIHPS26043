/**
 * impactService.js
 *
 * MODULE 10 — IMPACT TRACKING
 *
 * Outcome measurement, before/after metrics, citizen validation,
 * authority verification, and sustained outcome monitoring.
 */

"use strict";

const pool = require("../config/db");

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
    constructor(message) {
        super(message);
        this.name = "ConflictError";
    }
}

const VALID_VERIFICATION_STATUSES = ["UNVERIFIED", "UNDER_REVIEW", "VERIFIED", "REJECTED"];
const VERIFICATION_FLOW = {
    UNVERIFIED: ["UNDER_REVIEW"],
    UNDER_REVIEW: ["VERIFIED", "REJECTED"],
    REJECTED: ["UNDER_REVIEW"],
    VERIFIED: [],
};

const VALID_DIRECTIONS = ["INCREASE", "DECREASE", "TARGET"];
const VALID_CATEGORIES = [
    "GENERAL",
    "ENVIRONMENTAL",
    "PUBLIC_HEALTH",
    "INFRASTRUCTURE",
    "ECONOMIC",
    "SOCIAL",
    "GOVERNANCE",
];

function isAuthorityOrAdmin(user) {
    return user && ["AUTHORITY", "ADMIN"].includes(user.role);
}

/**
 * Check if user is authorized to manage an impact assessment
 * (Authority, Admin, Solution Submitter, or linked Contributor).
 */
async function canManage(user, implementationId) {
    if (!user) return false;
    if (isAuthorityOrAdmin(user)) return true;

    const res = await pool.query(
        `SELECT si.solution_id, s.submitted_by
         FROM solution_implementations si
         JOIN solutions s ON s.id = si.solution_id
         WHERE si.id = $1`,
        [implementationId]
    );

    if (res.rows.length === 0) return false;
    const row = res.rows[0];

    if (Number(row.submitted_by) === Number(user.id)) return true;

    const contribRes = await pool.query(
        `SELECT 1 FROM solution_contributors
         WHERE solution_id = $1 AND user_id = $2`,
        [row.solution_id, user.id]
    );

    return contribRes.rows.length > 0;
}

/**
 * Calculate target achievement percentage.
 * Avoids division by zero and clamps to [0, 100].
 */
function calculateTargetAchievement(direction, baseline, target, actual) {
    const b = Number(baseline);
    const t = Number(target);
    const a = Number(actual);

    let achievement = 0;

    if (direction === "INCREASE") {
        const targetDiff = t - b;
        if (targetDiff <= 0) return 0;
        achievement = ((a - b) / targetDiff) * 100;
    } else if (direction === "DECREASE") {
        const targetDiff = b - t;
        if (targetDiff <= 0) return 0;
        achievement = ((b - a) / targetDiff) * 100;
    } else if (direction === "TARGET") {
        if (t === 0) {
            achievement = a === 0 ? 100 : 0;
        } else {
            achievement = 100 - (Math.abs(a - t) / Math.abs(t)) * 100;
        }
    }

    if (isNaN(achievement) || achievement < 0) return 0.0;
    if (achievement > 100) return 100.0;
    return Number(achievement.toFixed(2));
}

/**
 * Calculate deterministic composite impact score and return its explainable components.
 */
async function computeImpactScore(assessmentId, verificationStatus) {
    // 1. Metric Achievement (50%)
    const metricRes = await pool.query(
        `SELECT COALESCE(AVG(achievement_percentage), 0)::numeric AS avg_achievement,
                COUNT(*)::int AS count
         FROM impact_metrics
         WHERE impact_assessment_id = $1`,
        [assessmentId]
    );

    const metricCount = metricRes.rows[0].count;
    const metricAverage = metricCount > 0 ? Number(metricRes.rows[0].avg_achievement) : 0.0;

    // 2. Citizen Consensus (30%)
    const feedbackRes = await pool.query(
        `SELECT
            COUNT(*)::int AS count,
            COALESCE(AVG(rating), 0)::numeric AS avg_rating,
            COALESCE(COUNT(*) FILTER (WHERE is_resolved = true), 0)::int AS resolved_count
         FROM impact_citizen_feedback
         WHERE impact_assessment_id = $1`,
        [assessmentId]
    );

    const feedbackCount = feedbackRes.rows[0].count;
    let citizenConsensus = 50.0; // neutral default when no citizen feedback exists

    if (feedbackCount > 0) {
        const avgRating = Number(feedbackRes.rows[0].avg_rating);
        const resolvedPct = (feedbackRes.rows[0].resolved_count / feedbackCount) * 100;
        citizenConsensus = 0.5 * ((avgRating / 5) * 100) + 0.5 * resolvedPct;
    }

    // 3. Authority Verification (20%)
    let verificationPoints = 5.0; // default UNVERIFIED
    if (verificationStatus === "VERIFIED") verificationPoints = 20.0;
    else if (verificationStatus === "UNDER_REVIEW") verificationPoints = 10.0;
    else if (verificationStatus === "REJECTED") verificationPoints = 0.0;

    // Total
    const rawTotal = 0.5 * metricAverage + 0.3 * citizenConsensus + verificationPoints;
    const totalScore = Number(Math.min(100, Math.max(0, rawTotal)).toFixed(2));

    return {
        metric_average: Number(metricAverage.toFixed(2)),
        metric_contribution: Number((0.5 * metricAverage).toFixed(2)),
        citizen_consensus: Number(citizenConsensus.toFixed(2)),
        citizen_contribution: Number((0.3 * citizenConsensus).toFixed(2)),
        verification_points: Number(verificationPoints.toFixed(2)),
        total_impact_score: totalScore,
    };
}

/**
 * Recalculate and persist the impact score for an assessment.
 */
async function recalculateAndPersistScore(assessmentId) {
    const aRes = await pool.query(
        `SELECT id, verification_status FROM implementation_impact_assessments WHERE id = $1`,
        [assessmentId]
    );
    if (aRes.rows.length === 0) return;

    const components = await computeImpactScore(assessmentId, aRes.rows[0].verification_status);

    await pool.query(
        `UPDATE implementation_impact_assessments
         SET impact_score = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [components.total_impact_score, assessmentId]
    );

    return components;
}

/**
 * Format assessment record with sanitized author/verifier details.
 */
function formatAssessment(row, scoreComponents = null) {
    if (!row) return null;
    return {
        id: row.id,
        implementation_id: row.implementation_id,
        problem_id: row.problem_id,
        measurement_start_date: row.measurement_start_date,
        measurement_end_date: row.measurement_end_date,
        outcome_summary: row.outcome_summary,
        impact_score: Number(row.impact_score),
        score_components: scoreComponents,
        score_breakdown: scoreComponents,
        verification_status: row.verification_status,
        verified_by: row.verified_by,
        verified_at: row.verified_at,
        verification_notes: row.verification_notes,
        is_sustained: Boolean(row.is_sustained),
        sustained_monitoring_date: row.sustained_monitoring_date,
        sustained_notes: row.sustained_notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
        verifier: row.verifier_name
            ? { id: row.verified_by, name: row.verifier_name, role: row.verifier_role }
            : row.verified_by
            ? { id: row.verified_by }
            : null,
    };
}

// ---------------------------------------------------------------------------
// 1. CREATE IMPACT ASSESSMENT
// ---------------------------------------------------------------------------

async function createImpactAssessment({ implementationId, user, payload }) {
    if (!payload || typeof payload !== "object") {
        throw new ValidationError("Payload must be an object");
    }

    // 1. Fetch implementation server-side
    const implRes = await pool.query(
        `SELECT id, problem_id, status FROM solution_implementations WHERE id = $1`,
        [implementationId]
    );

    if (implRes.rows.length === 0) {
        throw new NotFoundError("Implementation project not found");
    }

    const impl = implRes.rows[0];

    // 2. CRITICAL PRECONDITION: implementation status must be COMPLETED
    if (impl.status !== "COMPLETED") {
        throw new ValidationError(
            `Impact assessment can only be initiated for COMPLETED implementations (current: "${impl.status}")`
        );
    }

    // 3. Authorization check
    const authorized = await canManage(user, implementationId);
    if (!authorized) {
        throw new ForbiddenError("You do not have permission to initiate impact assessment");
    }

    // 4. Duplicate assessment check (UNIQUE implementation_id)
    const dupCheck = await pool.query(
        `SELECT id FROM implementation_impact_assessments WHERE implementation_id = $1`,
        [implementationId]
    );
    if (dupCheck.rows.length > 0) {
        throw new ConflictError("An impact assessment already exists for this implementation");
    }

    // 5. Date validation & defaults
    const rawStart = payload.measurement_start_date || payload.assessment_period_start || new Date().toISOString().split("T")[0];
    const rawEnd = payload.measurement_end_date || payload.assessment_period_end || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

    const start = new Date(rawStart);
    const end = new Date(rawEnd);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new ValidationError("Dates must be valid calendar dates (YYYY-MM-DD)");
    }
    if (end < start) {
        throw new ValidationError('"measurement_end_date" must be on or after "measurement_start_date"');
    }

    const summaryText = payload.outcome_summary || payload.summary || payload.description || payload.title || null;

    // 6. Insert assessment record (never trust client problem_id, derive from implementation)
    const insertRes = await pool.query(
        `INSERT INTO implementation_impact_assessments
            (implementation_id, problem_id, measurement_start_date, measurement_end_date, outcome_summary, verification_status, impact_score)
         VALUES ($1, $2, $3, $4, $5, 'UNVERIFIED', 20.00)
         RETURNING *`,
        [
            implementationId,
            impl.problem_id,
            rawStart,
            rawEnd,
            summaryText ? summaryText.trim() : null,
        ]
    );

    const assessment = insertRes.rows[0];
    const scoreComponents = await recalculateAndPersistScore(assessment.id);

    return formatAssessment(assessment, scoreComponents);
}

// ---------------------------------------------------------------------------
// 2. GET IMPACT ASSESSMENT BY IMPLEMENTATION ID
// ---------------------------------------------------------------------------

async function getImpactAssessmentByImplementation(implementationId) {
    const res = await pool.query(
        `SELECT iia.*, u.name AS verifier_name, u.role AS verifier_role
         FROM implementation_impact_assessments iia
         LEFT JOIN users u ON u.id = iia.verified_by
         WHERE iia.implementation_id = $1`,
        [implementationId]
    );

    if (res.rows.length === 0) {
        throw new NotFoundError("No impact assessment found for this implementation");
    }

    const assessment = res.rows[0];
    const scoreComponents = await computeImpactScore(assessment.id, assessment.verification_status);

    // Get metrics
    const metricsRes = await pool.query(
        `SELECT * FROM impact_metrics WHERE impact_assessment_id = $1 ORDER BY id ASC`,
        [assessment.id]
    );

    // Get feedback stats
    const fbRes = await pool.query(
        `SELECT COUNT(*)::int AS total,
                COALESCE(AVG(rating), 0)::numeric AS avg_rating,
                COALESCE(COUNT(*) FILTER (WHERE is_resolved = true), 0)::int AS resolved_count
         FROM impact_citizen_feedback
         WHERE impact_assessment_id = $1`,
        [assessment.id]
    );

    const formatted = formatAssessment(assessment, scoreComponents);
    return {
        ...formatted,
        metrics: metricsRes.rows.map((m) => ({
            ...m,
            baseline_value: Number(m.baseline_value),
            target_value: Number(m.target_value),
            actual_value: Number(m.actual_value),
            achievement_percentage: Number(m.achievement_percentage),
        })),
        citizen_feedback_summary: {
            total_feedback: fbRes.rows[0].total,
            average_rating: Number(Number(fbRes.rows[0].avg_rating).toFixed(2)),
            resolved_count: fbRes.rows[0].resolved_count,
        },
    };
}

// ---------------------------------------------------------------------------
// 3. GET IMPACT ASSESSMENT BY ASSESSMENT ID
// ---------------------------------------------------------------------------

async function getImpactAssessmentById(id) {
    const res = await pool.query(
        `SELECT iia.*, u.name AS verifier_name, u.role AS verifier_role
         FROM implementation_impact_assessments iia
         LEFT JOIN users u ON u.id = iia.verified_by
         WHERE iia.id = $1`,
        [id]
    );

    if (res.rows.length === 0) {
        throw new NotFoundError("Impact assessment not found");
    }

    const assessment = res.rows[0];
    const scoreComponents = await computeImpactScore(assessment.id, assessment.verification_status);

    return formatAssessment(assessment, scoreComponents);
}

// ---------------------------------------------------------------------------
// 4. UPDATE IMPACT ASSESSMENT
// ---------------------------------------------------------------------------

async function updateImpactAssessment({ id, user, payload }) {
    const aRes = await pool.query(
        `SELECT id, implementation_id, measurement_start_date, measurement_end_date FROM implementation_impact_assessments WHERE id = $1`,
        [id]
    );

    if (aRes.rows.length === 0) {
        throw new NotFoundError("Impact assessment not found");
    }

    const authorized = await canManage(user, aRes.rows[0].implementation_id);
    if (!authorized) {
        throw new ForbiddenError("You do not have permission to update this impact assessment");
    }

    const rawStart = payload.measurement_start_date || payload.assessment_period_start;
    const rawEnd = payload.measurement_end_date || payload.assessment_period_end;
    const rawSummary = payload.outcome_summary || payload.summary || payload.methodology;

    let startDate = aRes.rows[0].measurement_start_date;
    let endDate = aRes.rows[0].measurement_end_date;

    if (rawStart) {
        startDate = new Date(rawStart);
    }
    if (rawEnd) {
        endDate = new Date(rawEnd);
    }

    if (new Date(endDate) < new Date(startDate)) {
        throw new ValidationError('"measurement_end_date" must be on or after "measurement_start_date"');
    }

    const updateRes = await pool.query(
        `UPDATE implementation_impact_assessments
         SET measurement_start_date = COALESCE($1::date, measurement_start_date),
             measurement_end_date = COALESCE($2::date, measurement_end_date),
             outcome_summary = COALESCE($3::text, outcome_summary),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [
            rawStart || null,
            rawEnd || null,
            rawSummary ? rawSummary.trim() : null,
            id,
        ]
    );

    const scoreComponents = await computeImpactScore(id, updateRes.rows[0].verification_status);
    return formatAssessment(updateRes.rows[0], scoreComponents);
}

// ---------------------------------------------------------------------------
// 5. ADD METRIC
// ---------------------------------------------------------------------------

async function addMetric({ assessmentId, user, payload }) {
    const aRes = await pool.query(
        `SELECT id, implementation_id FROM implementation_impact_assessments WHERE id = $1`,
        [assessmentId]
    );

    if (aRes.rows.length === 0) {
        throw new NotFoundError("Impact assessment not found");
    }

    const authorized = await canManage(user, aRes.rows[0].implementation_id);
    if (!authorized) {
        throw new ForbiddenError("You do not have permission to add metrics");
    }

    if (!payload.metric_name || typeof payload.metric_name !== "string" || !payload.metric_name.trim()) {
        throw new ValidationError('"metric_name" is required');
    }
    if (!payload.unit || typeof payload.unit !== "string" || !payload.unit.trim()) {
        throw new ValidationError('"unit" is required');
    }

    const direction = payload.direction ? String(payload.direction).trim().toUpperCase() : "INCREASE";
    if (!VALID_DIRECTIONS.includes(direction)) {
        throw new ValidationError(`"direction" must be one of: ${VALID_DIRECTIONS.join(", ")}`);
    }

    const category = payload.category ? String(payload.category).trim().toUpperCase() : "GENERAL";
    if (!VALID_CATEGORIES.includes(category)) {
        throw new ValidationError(`"category" must be one of: ${VALID_CATEGORIES.join(", ")}`);
    }

    if (payload.baseline_value === undefined || payload.baseline_value === null || isNaN(Number(payload.baseline_value))) {
        throw new ValidationError('"baseline_value" must be a valid number');
    }
    if (payload.target_value === undefined || payload.target_value === null || isNaN(Number(payload.target_value))) {
        throw new ValidationError('"target_value" must be a valid number');
    }
    if (payload.actual_value === undefined || payload.actual_value === null || isNaN(Number(payload.actual_value))) {
        throw new ValidationError('"actual_value" must be a valid number');
    }

    const baseline = Number(payload.baseline_value);
    const target = Number(payload.target_value);
    const actual = Number(payload.actual_value);

    // Metric validation:
    // For INCREASE: target > baseline
    if (direction === "INCREASE" && target <= baseline) {
        throw new ValidationError('For INCREASE metrics, "target_value" must be strictly greater than "baseline_value"');
    }

    // For DECREASE: target < baseline
    if (direction === "DECREASE" && target >= baseline) {
        throw new ValidationError('For DECREASE metrics, "target_value" must be strictly less than "baseline_value"');
    }

    // Calculate achievement percentage server-side
    const achievement = calculateTargetAchievement(direction, baseline, target, actual);

    const res = await pool.query(
        `INSERT INTO impact_metrics
            (impact_assessment_id, metric_name, category, unit, direction,
             baseline_value, target_value, actual_value, achievement_percentage,
             measurement_date, evidence_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
            assessmentId,
            payload.metric_name.trim(),
            category,
            payload.unit.trim(),
            direction,
            baseline,
            target,
            actual,
            achievement,
            payload.measurement_date || new Date(),
            payload.evidence_url ? payload.evidence_url.trim() : null,
        ]
    );

    // Recalculate impact assessment score
    await recalculateAndPersistScore(assessmentId);

    const m = res.rows[0];
    return {
        ...m,
        baseline_value: Number(m.baseline_value),
        target_value: Number(m.target_value),
        actual_value: Number(m.actual_value),
        achievement_percentage: Number(m.achievement_percentage),
    };
}

// ---------------------------------------------------------------------------
// 6. UPDATE METRIC
// ---------------------------------------------------------------------------

async function updateMetric({ assessmentId, metricId, user, payload }) {
    const aRes = await pool.query(
        `SELECT id, implementation_id FROM implementation_impact_assessments WHERE id = $1`,
        [assessmentId]
    );
    if (aRes.rows.length === 0) {
        throw new NotFoundError("Impact assessment not found");
    }

    const authorized = await canManage(user, aRes.rows[0].implementation_id);
    if (!authorized) {
        throw new ForbiddenError("You do not have permission to update metrics");
    }

    const mRes = await pool.query(
        `SELECT * FROM impact_metrics WHERE id = $1 AND impact_assessment_id = $2`,
        [metricId, assessmentId]
    );
    if (mRes.rows.length === 0) {
        throw new NotFoundError("Metric not found");
    }

    const current = mRes.rows[0];
    const actual = payload.actual_value !== undefined && payload.actual_value !== null
        ? Number(payload.actual_value)
        : Number(current.actual_value);

    if (isNaN(actual)) {
        throw new ValidationError('"actual_value" must be a valid number');
    }

    const baseline = Number(current.baseline_value);
    const target = Number(current.target_value);
    const direction = current.direction;

    const achievement = calculateTargetAchievement(direction, baseline, target, actual);

    const updateRes = await pool.query(
        `UPDATE impact_metrics
         SET actual_value = $1,
             achievement_percentage = $2,
             measurement_date = COALESCE($3, measurement_date),
             evidence_url = COALESCE($4, evidence_url),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [actual, achievement, payload.measurement_date || null, payload.evidence_url || null, metricId]
    );

    await recalculateAndPersistScore(assessmentId);

    const m = updateRes.rows[0];
    return {
        ...m,
        baseline_value: Number(m.baseline_value),
        target_value: Number(m.target_value),
        actual_value: Number(m.actual_value),
        achievement_percentage: Number(m.achievement_percentage),
    };
}

// ---------------------------------------------------------------------------
// 7. BEFORE VS AFTER COMPARISON
// ---------------------------------------------------------------------------

async function getBeforeAfterComparison(assessmentId) {
    const aRes = await pool.query(
        `SELECT id, implementation_id, problem_id, impact_score
         FROM implementation_impact_assessments
         WHERE id = $1`,
        [assessmentId]
    );

    if (aRes.rows.length === 0) {
        throw new NotFoundError("Impact assessment not found");
    }

    const res = await pool.query(
        `SELECT * FROM impact_metrics WHERE impact_assessment_id = $1 ORDER BY id ASC`,
        [assessmentId]
    );

    const comparison = res.rows.map((m) => {
        const b = Number(m.baseline_value);
        const t = Number(m.target_value);
        const a = Number(m.actual_value);
        const dir = m.direction;

        let absoluteImprovement = 0;
        let distanceFromTarget = null;

        if (dir === "INCREASE") {
            absoluteImprovement = Number((a - b).toFixed(2));
        } else if (dir === "DECREASE") {
            absoluteImprovement = Number((b - a).toFixed(2));
        } else if (dir === "TARGET") {
            distanceFromTarget = Number(Math.abs(a - t).toFixed(2));
            absoluteImprovement = Number((100 - (distanceFromTarget / Math.max(1, Math.abs(t))) * 100).toFixed(2));
        }

        return {
            metric_id: m.id,
            metric_name: m.metric_name,
            category: m.category,
            unit: m.unit,
            direction: m.direction,
            baseline: b,
            target: t,
            actual: a,
            absolute_improvement: absoluteImprovement,
            distance_from_target: distanceFromTarget,
            achievement_percentage: Number(m.achievement_percentage),
            measurement_date: m.measurement_date,
            evidence_url: m.evidence_url,
        };
    });

    return {
        impact_assessment_id: assessmentId,
        impact_score: Number(aRes.rows[0].impact_score),
        total_metrics: comparison.length,
        comparison,
        metrics: comparison,
    };
}

// ---------------------------------------------------------------------------
// 8. CITIZEN FEEDBACK
// ---------------------------------------------------------------------------

async function submitCitizenFeedback({ assessmentId, user, payload }) {
    if (!user || user.role !== "CITIZEN") {
        throw new ForbiddenError("Only registered citizens can submit post-implementation feedback");
    }

    const aCheck = await pool.query(
        `SELECT id FROM implementation_impact_assessments WHERE id = $1`,
        [assessmentId]
    );
    if (aCheck.rows.length === 0) {
        throw new NotFoundError("Impact assessment not found");
    }

    if (!payload || typeof payload !== "object") {
        throw new ValidationError("Payload must be an object");
    }

    // Explicit validation for rating (1-5)
    if (payload.rating === undefined || payload.rating === null) {
        throw new ValidationError('"rating" is required');
    }
    const rating = Number(payload.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new ValidationError('"rating" must be an integer between 1 and 5');
    }

    // Explicit validation for is_resolved (must be explicit boolean)
    if (payload.is_resolved === undefined || payload.is_resolved === null || typeof payload.is_resolved !== "boolean") {
        throw new ValidationError("is_resolved must be explicitly supplied as a boolean (true or false)");
    }

    // Upsert feedback
    const res = await pool.query(
        `INSERT INTO impact_citizen_feedback
            (impact_assessment_id, user_id, rating, is_resolved, comment, observed_outcome, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         ON CONFLICT (impact_assessment_id, user_id)
         DO UPDATE SET
            rating = EXCLUDED.rating,
            is_resolved = EXCLUDED.is_resolved,
            comment = EXCLUDED.comment,
            observed_outcome = EXCLUDED.observed_outcome,
            updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [
            assessmentId,
            user.id,
            rating,
            payload.is_resolved,
            payload.comment ? payload.comment.trim() : null,
            payload.observed_outcome ? payload.observed_outcome.trim() : null,
        ]
    );

    // Recalculate score
    await recalculateAndPersistScore(assessmentId);

    return {
        ...res.rows[0],
        citizen: { id: user.id, name: user.name, role: user.role },
    };
}

async function getCitizenFeedback(assessmentId) {
    const aCheck = await pool.query(
        `SELECT id FROM implementation_impact_assessments WHERE id = $1`,
        [assessmentId]
    );
    if (aCheck.rows.length === 0) {
        throw new NotFoundError("Impact assessment not found");
    }

    const res = await pool.query(
        `SELECT icf.*, u.name AS citizen_name, u.role AS citizen_role
         FROM impact_citizen_feedback icf
         JOIN users u ON u.id = icf.user_id
         WHERE icf.impact_assessment_id = $1
         ORDER BY icf.created_at DESC`,
        [assessmentId]
    );

    return res.rows.map((row) => ({
        id: row.id,
        impact_assessment_id: row.impact_assessment_id,
        rating: row.rating,
        is_resolved: row.is_resolved,
        comment: row.comment,
        observed_outcome: row.observed_outcome,
        created_at: row.created_at,
        updated_at: row.updated_at,
        citizen: {
            id: row.user_id,
            name: row.citizen_name,
            role: row.citizen_role,
        },
    }));
}

// ---------------------------------------------------------------------------
// 9. AUTHORITY VERIFICATION
// ---------------------------------------------------------------------------

async function verifyImpactAssessment({ assessmentId, user, payload }) {
    if (!isAuthorityOrAdmin(user)) {
        throw new ForbiddenError("Only authorities and administrators can verify impact assessments");
    }

    if (!payload || !payload.verification_status) {
        throw new ValidationError('"verification_status" is required');
    }

    const newStatus = String(payload.verification_status).trim().toUpperCase();
    if (!VALID_VERIFICATION_STATUSES.includes(newStatus)) {
        throw new ValidationError(`"verification_status" must be one of: ${VALID_VERIFICATION_STATUSES.join(", ")}`);
    }

    const aRes = await pool.query(
        `SELECT id, verification_status FROM implementation_impact_assessments WHERE id = $1`,
        [assessmentId]
    );
    if (aRes.rows.length === 0) {
        throw new NotFoundError("Impact assessment not found");
    }

    const currentStatus = aRes.rows[0].verification_status;
    const allowed = VERIFICATION_FLOW[currentStatus] || [];

    if (currentStatus !== newStatus && !allowed.includes(newStatus)) {
        throw new ValidationError(`Invalid verification transition from "${currentStatus}" to "${newStatus}"`);
    }

    const verifiedAt = ["VERIFIED", "REJECTED"].includes(newStatus) ? new Date() : null;

    const updateRes = await pool.query(
        `UPDATE implementation_impact_assessments
         SET verification_status = $1,
             verified_by = $2,
             verified_at = $3,
             verification_notes = COALESCE($4, verification_notes),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [newStatus, user.id, verifiedAt, payload.verification_notes || null, assessmentId]
    );

    // Recalculate score with new verification points
    const scoreComponents = await recalculateAndPersistScore(assessmentId);

    return formatAssessment(updateRes.rows[0], scoreComponents);
}

// ---------------------------------------------------------------------------
// 10. SUSTAINED OUTCOME
// ---------------------------------------------------------------------------

async function markSustainedOutcome({ assessmentId, user, payload }) {
    if (!isAuthorityOrAdmin(user)) {
        throw new ForbiddenError("Only authorities and administrators can mark an outcome as sustained");
    }

    const aRes = await pool.query(
        `SELECT id FROM implementation_impact_assessments WHERE id = $1`,
        [assessmentId]
    );
    if (aRes.rows.length === 0) {
        throw new NotFoundError("Impact assessment not found");
    }

    const monitoringDate = payload?.sustained_monitoring_date || new Date();
    const notes = payload?.sustained_notes ? payload.sustained_notes.trim() : "Outcome verified sustained.";

    const updateRes = await pool.query(
        `UPDATE implementation_impact_assessments
         SET is_sustained = true,
             sustained_monitoring_date = $1,
             sustained_notes = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [monitoringDate, notes, assessmentId]
    );

    const scoreComponents = await computeImpactScore(assessmentId, updateRes.rows[0].verification_status);
    return formatAssessment(updateRes.rows[0], scoreComponents);
}

// ---------------------------------------------------------------------------
// 11. PROBLEM IMPACT SUMMARY
// ---------------------------------------------------------------------------

async function getProblemImpactSummary(problemId) {
    const probCheck = await pool.query(`SELECT id, title, status FROM problems WHERE id = $1`, [problemId]);
    if (probCheck.rows.length === 0) {
        throw new NotFoundError("Problem not found");
    }

    const res = await pool.query(
        `SELECT iia.*, si.title AS implementation_title, si.status AS implementation_status,
                u.name AS verifier_name, u.role AS verifier_role
         FROM implementation_impact_assessments iia
         JOIN solution_implementations si ON si.id = iia.implementation_id
         LEFT JOIN users u ON u.id = iia.verified_by
         WHERE iia.problem_id = $1
         ORDER BY iia.created_at DESC`,
        [problemId]
    );

    const assessments = [];
    let totalScore = 0;
    let sustainedCount = 0;
    let verifiedCount = 0;

    for (const row of res.rows) {
        const components = await computeImpactScore(row.id, row.verification_status);
        const formatted = formatAssessment(row, components);
        totalScore += formatted.impact_score;
        if (formatted.is_sustained) sustainedCount++;
        if (formatted.verification_status === "VERIFIED") verifiedCount++;

        assessments.push({
            ...formatted,
            implementation_title: row.implementation_title,
            implementation_status: row.implementation_status,
        });
    }

    const avgScore = assessments.length > 0 ? Number((totalScore / assessments.length).toFixed(2)) : 0;

    // Fetch top metrics across this problem's assessments
    const metricsRes = await pool.query(
        `SELECT im.*
         FROM impact_metrics im
         JOIN implementation_impact_assessments iia ON iia.id = im.impact_assessment_id
         WHERE iia.problem_id = $1
         ORDER BY im.achievement_percentage DESC
         LIMIT 10`,
        [problemId]
    );

    const topMetrics = metricsRes.rows.map((m) => ({
        id: m.id,
        impact_assessment_id: m.impact_assessment_id,
        metric_name: m.metric_name,
        category: m.category,
        unit: m.unit,
        direction: m.direction,
        achievement_percentage: Number(m.achievement_percentage),
    }));

    return {
        problem_id: problemId,
        problem_title: probCheck.rows[0].title,
        problem_status: probCheck.rows[0].status,
        total_assessments: assessments.length,
        sustained_assessments: sustainedCount,
        verified_assessments: verifiedCount,
        average_impact_score: avgScore,
        top_metrics: topMetrics,
        assessments,
    };
}

module.exports = {
    ValidationError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    VALID_VERIFICATION_STATUSES,
    VERIFICATION_FLOW,
    VALID_DIRECTIONS,
    VALID_CATEGORIES,
    isAuthorityOrAdmin,
    canManage,
    calculateTargetAchievement,
    computeImpactScore,
    recalculateAndPersistScore,
    createImpactAssessment,
    getImpactAssessmentByImplementation,
    getImpactAssessmentById,
    updateImpactAssessment,
    addMetric,
    updateMetric,
    getBeforeAfterComparison,
    submitCitizenFeedback,
    getCitizenFeedback,
    verifyImpactAssessment,
    markSustainedOutcome,
    getProblemImpactSummary,
};
