/**
 * solutionEvaluationService.js
 *
 * MODULE 8 — SOLUTION EVALUATION
 *
 * Scoring model:
 *   Impact                 25% (x 5)
 *   Feasibility & Tech     20% (x 4)
 *   Cost Efficiency        15% (x 3)
 *   Scalability            15% (x 3)
 *   Evidence & Validation  15% (x 3)
 *   Risk Mitigation        10% (x 2)
 *
 * Formula:
 *   Composite Score =
 *     Impact * 5 +
 *     Feasibility * 4 +
 *     Cost Efficiency * 3 +
 *     Scalability * 3 +
 *     Evidence * 3 +
 *     Risk * 2
 *
 * Deterministic Range: 20.00 to 100.00
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

/**
 * Roles allowed to evaluate solutions.
 */
const EVALUATOR_ROLES = ["AUTHORITY", "ADMIN"];

/**
 * Allowed recommendation values.
 */
const VALID_RECOMMENDATIONS = ["RECOMMENDED", "CONSIDER", "NOT_RECOMMENDED"];

/**
 * Dimension weights and definitions.
 */
const SCORING_WEIGHTS = {
    impact: 5,
    feasibility: 4,
    cost_efficiency: 3,
    scalability: 3,
    evidence: 3,
    risk: 2,
};

/**
 * Calculate deterministic composite score.
 *
 * @param {object} scores
 * @returns {number} composite score between 20.00 and 100.00
 */
function calculateCompositeScore(scores) {
    const raw =
        Number(scores.impact_score) * SCORING_WEIGHTS.impact +
        Number(scores.feasibility_score) * SCORING_WEIGHTS.feasibility +
        Number(scores.cost_efficiency_score) * SCORING_WEIGHTS.cost_efficiency +
        Number(scores.scalability_score) * SCORING_WEIGHTS.scalability +
        Number(scores.evidence_score) * SCORING_WEIGHTS.evidence +
        Number(scores.risk_score) * SCORING_WEIGHTS.risk;

    return Number(raw.toFixed(2));
}

/**
 * Validate an integer score between 1 and 5.
 */
function validateScoreField(value, fieldName) {
    if (value === undefined || value === null) {
        return `"${fieldName}" is required`;
    }
    if (typeof value === "boolean") {
        return `"${fieldName}" must be an integer between 1 and 5`;
    }
    const num = Number(value);
    if (!Number.isInteger(num) || num < 1 || num > 5) {
        return `"${fieldName}" must be an integer between 1 and 5`;
    }
    return null;
}

/**
 * Validate evaluation payload.
 * Returns array of error messages.
 */
function validateEvaluationPayload(payload) {
    const errors = [];

    if (!payload || typeof payload !== "object") {
        errors.push("Payload must be an object");
        return errors;
    }

    const scoreFields = [
        "impact_score",
        "feasibility_score",
        "cost_efficiency_score",
        "scalability_score",
        "evidence_score",
        "risk_score",
    ];

    for (const field of scoreFields) {
        const err = validateScoreField(payload[field], field);
        if (err) errors.push(err);
    }

    if (payload.comments !== undefined && payload.comments !== null) {
        if (typeof payload.comments !== "string") {
            errors.push('"comments" must be a string');
        } else if (payload.comments.length > 2000) {
            errors.push('"comments" must not exceed 2000 characters');
        }
    }

    if (payload.recommendation !== undefined && payload.recommendation !== null) {
        if (!VALID_RECOMMENDATIONS.includes(payload.recommendation)) {
            errors.push(
                `"recommendation" must be one of: ${VALID_RECOMMENDATIONS.join(", ")}`
            );
        }
    }

    return errors;
}

/**
 * Submit or update an evaluation for a solution.
 *
 * @param {object} params
 * @param {number} params.solutionId
 * @param {number} params.evaluatorId
 * @param {string} params.evaluatorRole
 * @param {object} params.payload
 * @returns {Promise<object>}
 */
async function evaluateSolution({
    solutionId,
    evaluatorId,
    evaluatorRole,
    payload,
}) {
    // 1. RBAC check
    if (!EVALUATOR_ROLES.includes(evaluatorRole)) {
        throw new ForbiddenError("You do not have permission to evaluate solutions");
    }

    // 2. Validate payload
    const errors = validateEvaluationPayload(payload);
    if (errors.length > 0) {
        throw new ValidationError(errors.join("; "));
    }

    // 3. Check solution exists
    const solRes = await pool.query(
        `SELECT id, problem_id, submitted_by, status
         FROM solutions
         WHERE id = $1`,
        [solutionId]
    );

    if (solRes.rows.length === 0) {
        throw new NotFoundError("Solution not found");
    }

    const solution = solRes.rows[0];

    // 4. Prevent self-evaluation
    if (Number(solution.submitted_by) === Number(evaluatorId)) {
        throw new ForbiddenError("You cannot evaluate your own solution");
    }

    // 5. Calculate deterministic composite score
    const compositeScore = calculateCompositeScore(payload);
    const recommendation = payload.recommendation || "CONSIDER";
    const comments = payload.comments ? payload.comments.trim() : null;

    // 6. Upsert evaluation
    const evalRes = await pool.query(
        `INSERT INTO solution_evaluations
            (solution_id, evaluator_id,
             impact_score, feasibility_score, cost_efficiency_score,
             scalability_score, evidence_score, risk_score,
             composite_score, comments, recommendation, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
         ON CONFLICT (solution_id, evaluator_id)
         DO UPDATE SET
             impact_score = EXCLUDED.impact_score,
             feasibility_score = EXCLUDED.feasibility_score,
             cost_efficiency_score = EXCLUDED.cost_efficiency_score,
             scalability_score = EXCLUDED.scalability_score,
             evidence_score = EXCLUDED.evidence_score,
             risk_score = EXCLUDED.risk_score,
             composite_score = EXCLUDED.composite_score,
             comments = EXCLUDED.comments,
             recommendation = EXCLUDED.recommendation,
             updated_at = CURRENT_TIMESTAMP
         RETURNING id, solution_id, evaluator_id,
                   impact_score, feasibility_score, cost_efficiency_score,
                   scalability_score, evidence_score, risk_score,
                   composite_score, comments, recommendation,
                   created_at, updated_at`,
        [
            solutionId,
            evaluatorId,
            Number(payload.impact_score),
            Number(payload.feasibility_score),
            Number(payload.cost_efficiency_score),
            Number(payload.scalability_score),
            Number(payload.evidence_score),
            Number(payload.risk_score),
            compositeScore,
            comments,
            recommendation,
        ]
    );

    const savedEvaluation = {
        ...evalRes.rows[0],
        composite_score: Number(evalRes.rows[0].composite_score),
    };

    // 7. Lifecycle progression: first evaluation moves SUBMITTED -> UNDER_EVALUATION
    if (solution.status === "SUBMITTED") {
        await pool.query(
            `UPDATE solutions
             SET status = 'UNDER_EVALUATION', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND status = 'SUBMITTED'`,
            [solutionId]
        );
    }

    return savedEvaluation;
}

/**
 * Format evaluation record with sanitized evaluator data.
 */
function formatEvaluation(row) {
    return {
        id: row.id,
        solution_id: row.solution_id,
        impact_score: row.impact_score,
        feasibility_score: row.feasibility_score,
        cost_efficiency_score: row.cost_efficiency_score,
        scalability_score: row.scalability_score,
        evidence_score: row.evidence_score,
        risk_score: row.risk_score,
        composite_score: Number(row.composite_score),
        comments: row.comments,
        recommendation: row.recommendation,
        created_at: row.created_at,
        updated_at: row.updated_at,
        evaluator: {
            id: row.evaluator_id,
            name: row.evaluator_name,
            role: row.evaluator_role,
        },
    };
}

/**
 * Retrieve all evaluations for a solution along with averages.
 *
 * @param {number} solutionId
 * @returns {Promise<object>}
 */
async function getSolutionEvaluations(solutionId) {
    // Check solution exists
    const solRes = await pool.query(
        `SELECT id, problem_id, title, status FROM solutions WHERE id = $1`,
        [solutionId]
    );

    if (solRes.rows.length === 0) {
        throw new NotFoundError("Solution not found");
    }

    const evalRes = await pool.query(
        `SELECT se.*,
                u.name AS evaluator_name,
                u.role AS evaluator_role
         FROM solution_evaluations se
         JOIN users u ON u.id = se.evaluator_id
         WHERE se.solution_id = $1
         ORDER BY se.created_at ASC`,
        [solutionId]
    );

    const evaluations = evalRes.rows.map(formatEvaluation);

    if (evaluations.length === 0) {
        return {
            solution_id: solutionId,
            total_evaluations: 0,
            average_composite_score: null,
            dimension_averages: null,
            evaluations: [],
        };
    }

    const count = evaluations.length;
    const sumComposite = evaluations.reduce((acc, e) => acc + e.composite_score, 0);
    const avgComposite = Number((sumComposite / count).toFixed(2));

    const avgDim = (key) =>
        Number((evaluations.reduce((acc, e) => acc + e[key], 0) / count).toFixed(2));

    return {
        solution_id: solutionId,
        total_evaluations: count,
        average_composite_score: avgComposite,
        dimension_averages: {
            impact: avgDim("impact_score"),
            feasibility: avgDim("feasibility_score"),
            cost_efficiency: avgDim("cost_efficiency_score"),
            scalability: avgDim("scalability_score"),
            evidence: avgDim("evidence_score"),
            risk: avgDim("risk_score"),
        },
        evaluations,
    };
}

/**
 * Retrieve compact evaluation summary for a solution.
 *
 * @param {number} solutionId
 * @returns {Promise<object>}
 */
async function getSolutionEvaluationSummary(solutionId) {
    const solRes = await pool.query(
        `SELECT id, title, status FROM solutions WHERE id = $1`,
        [solutionId]
    );

    if (solRes.rows.length === 0) {
        throw new NotFoundError("Solution not found");
    }

    const statsRes = await pool.query(
        `SELECT
            COUNT(*)::int AS count,
            ROUND(AVG(composite_score), 2)::numeric AS avg_composite,
            ROUND(AVG(impact_score), 2)::numeric AS avg_impact,
            ROUND(AVG(feasibility_score), 2)::numeric AS avg_feasibility,
            ROUND(AVG(cost_efficiency_score), 2)::numeric AS avg_cost_efficiency,
            ROUND(AVG(scalability_score), 2)::numeric AS avg_scalability,
            ROUND(AVG(evidence_score), 2)::numeric AS avg_evidence,
            ROUND(AVG(risk_score), 2)::numeric AS avg_risk,
            COUNT(*) FILTER (WHERE recommendation = 'RECOMMENDED')::int AS recommended_count,
            COUNT(*) FILTER (WHERE recommendation = 'CONSIDER')::int AS consider_count,
            COUNT(*) FILTER (WHERE recommendation = 'NOT_RECOMMENDED')::int AS not_recommended_count
         FROM solution_evaluations
         WHERE solution_id = $1`,
        [solutionId]
    );

    const stats = statsRes.rows[0];
    const count = stats.count || 0;

    return {
        solution_id: solutionId,
        evaluations_count: count,
        average_composite_score: count > 0 ? Number(stats.avg_composite) : null,
        dimension_averages:
            count > 0
                ? {
                      impact: Number(stats.avg_impact),
                      feasibility: Number(stats.avg_feasibility),
                      cost_efficiency: Number(stats.avg_cost_efficiency),
                      scalability: Number(stats.avg_scalability),
                      evidence: Number(stats.avg_evidence),
                      risk: Number(stats.avg_risk),
                  }
                : null,
        recommendations: {
            RECOMMENDED: stats.recommended_count || 0,
            CONSIDER: stats.consider_count || 0,
            NOT_RECOMMENDED: stats.not_recommended_count || 0,
        },
    };
}

/**
 * Retrieve ranked solutions for a problem.
 *
 * Ranking criteria:
 *   1. average_score DESC NULLS LAST
 *   2. evaluations_count DESC
 *   3. created_at ASC
 *
 * @param {number} problemId
 * @returns {Promise<object>}
 */
async function getRankedSolutionsForProblem(problemId) {
    const probCheck = await pool.query(
        `SELECT id, title, status FROM problems WHERE id = $1`,
        [problemId]
    );

    if (probCheck.rows.length === 0) {
        throw new NotFoundError("Problem not found");
    }

    const query = `
        SELECT
            s.id,
            s.problem_id,
            s.submitted_by,
            s.title,
            s.description,
            s.methodology,
            s.technology,
            s.expected_impact,
            s.estimated_cost,
            s.implementation_time,
            s.scalability,
            s.required_resources,
            s.risks,
            s.evidence,
            s.status,
            s.created_at,
            s.updated_at,
            u.name AS submitter_name,
            u.role AS submitter_role,
            COUNT(se.id)::int AS evaluations_count,
            ROUND(AVG(se.composite_score), 2)::numeric AS average_score,
            ROUND(AVG(se.impact_score), 2)::numeric AS avg_impact,
            ROUND(AVG(se.feasibility_score), 2)::numeric AS avg_feasibility,
            ROUND(AVG(se.cost_efficiency_score), 2)::numeric AS avg_cost_efficiency,
            ROUND(AVG(se.scalability_score), 2)::numeric AS avg_scalability,
            ROUND(AVG(se.evidence_score), 2)::numeric AS avg_evidence,
            ROUND(AVG(se.risk_score), 2)::numeric AS avg_risk
        FROM solutions s
        JOIN users u ON u.id = s.submitted_by
        LEFT JOIN solution_evaluations se ON se.solution_id = s.id
        WHERE s.problem_id = $1
        GROUP BY s.id, u.name, u.role
        ORDER BY
            average_score DESC NULLS LAST,
            evaluations_count DESC,
            s.created_at ASC
    `;

    const result = await pool.query(query, [problemId]);

    const rankedSolutions = result.rows.map((row, index) => ({
        rank: index + 1,
        id: row.id,
        problem_id: row.problem_id,
        submitted_by: row.submitted_by,
        submitter_name: row.submitter_name,
        submitter_role: row.submitter_role,
        title: row.title,
        description: row.description,
        methodology: row.methodology,
        technology: row.technology,
        expected_impact: row.expected_impact,
        estimated_cost: row.estimated_cost !== null ? Number(row.estimated_cost) : null,
        implementation_time: row.implementation_time,
        scalability: row.scalability,
        required_resources: row.required_resources,
        risks: row.risks,
        evidence: row.evidence,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        evaluations_count: row.evaluations_count,
        average_score: row.average_score !== null ? Number(row.average_score) : null,
        dimension_averages:
            row.evaluations_count > 0
                ? {
                      impact: Number(row.avg_impact),
                      feasibility: Number(row.avg_feasibility),
                      cost_efficiency: Number(row.avg_cost_efficiency),
                      scalability: Number(row.avg_scalability),
                      evidence: Number(row.avg_evidence),
                      risk: Number(row.avg_risk),
                  }
                : null,
    }));

    return {
        problem_id: problemId,
        total: rankedSolutions.length,
        ranked_solutions: rankedSolutions,
    };
}

module.exports = {
    ValidationError,
    ForbiddenError,
    NotFoundError,
    EVALUATOR_ROLES,
    VALID_RECOMMENDATIONS,
    SCORING_WEIGHTS,
    calculateCompositeScore,
    validateEvaluationPayload,
    evaluateSolution,
    getSolutionEvaluations,
    getSolutionEvaluationSummary,
    getRankedSolutionsForProblem,
};
