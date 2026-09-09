/**
 * solutionStatusService.js
 *
 * MODULE 8 — SOLUTION EVALUATION & LIFECYCLE
 *
 * Dedicated status lifecycle service for solutions.
 * Governs allowed transitions:
 *
 *   SUBMITTED
 *       ↓
 *   UNDER_EVALUATION
 *       ↓
 *   EVALUATED
 *       ├── APPROVED
 *       └── REJECTED
 *             ↓ (future reconsideration)
 *
 *   APPROVED
 *       ↓
 *   PILOT
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
 * Valid solution status transitions map.
 */
const SOLUTION_STATUS_FLOW = {
    SUBMITTED: ["UNDER_EVALUATION"],
    UNDER_EVALUATION: ["EVALUATED", "SUBMITTED"],
    EVALUATED: ["APPROVED", "REJECTED", "UNDER_EVALUATION"],
    APPROVED: ["PILOT", "EVALUATED"],
    REJECTED: ["UNDER_EVALUATION", "EVALUATED"],
    PILOT: ["IMPLEMENTING", "APPROVED"],
    IMPLEMENTING: ["COMPLETED", "PILOT"],
    COMPLETED: ["IMPLEMENTING"],
};

/**
 * Roles permitted to modify solution status.
 */
const STATUS_UPDATE_ROLES = ["AUTHORITY", "ADMIN"];

/**
 * Check whether a status transition is permitted.
 */
function isValidSolutionTransition(currentStatus, newStatus) {
    if (!currentStatus || !newStatus) return false;
    return SOLUTION_STATUS_FLOW[currentStatus]?.includes(newStatus) || false;
}

/**
 * Update solution status with validation and role protection.
 *
 * @param {object} params
 * @param {number} params.solutionId
 * @param {string} params.newStatus
 * @param {object} params.user
 * @returns {Promise<object>}
 */
async function updateSolutionStatus({ solutionId, newStatus, user }) {
    if (!user || !STATUS_UPDATE_ROLES.includes(user.role)) {
        throw new ForbiddenError(
            "Only authorities and administrators can update solution status"
        );
    }

    if (!newStatus || typeof newStatus !== "string") {
        throw new ValidationError("Status must be a non-empty string");
    }

    const trimmedStatus = newStatus.trim().toUpperCase();

    // Check valid status value exists in the flow
    if (!Object.keys(SOLUTION_STATUS_FLOW).includes(trimmedStatus)) {
        throw new ValidationError(`Unknown solution status: "${newStatus}"`);
    }

    // Retrieve solution
    const solRes = await pool.query(
        `SELECT id, status, problem_id, submitted_by, title
         FROM solutions
         WHERE id = $1`,
        [solutionId]
    );

    if (solRes.rows.length === 0) {
        throw new NotFoundError("Solution not found");
    }

    const currentStatus = solRes.rows[0].status;

    if (currentStatus === trimmedStatus) {
        // No-op or return current
        return solRes.rows[0];
    }

    if (!isValidSolutionTransition(currentStatus, trimmedStatus)) {
        throw new ValidationError(
            `Invalid status transition from "${currentStatus}" to "${trimmedStatus}"`
        );
    }

    const updateRes = await pool.query(
        `UPDATE solutions
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, problem_id, submitted_by, title, status, updated_at`,
        [trimmedStatus, solutionId]
    );

    return updateRes.rows[0];
}

module.exports = {
    ValidationError,
    ForbiddenError,
    NotFoundError,
    SOLUTION_STATUS_FLOW,
    STATUS_UPDATE_ROLES,
    isValidSolutionTransition,
    updateSolutionStatus,
};
