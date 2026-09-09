/**
 * solutionEvaluationRoutes.js
 *
 * MODULE 8 — SOLUTION EVALUATION & LIFECYCLE ROUTES
 *
 * Routes:
 *   POST  /api/solutions/:id/evaluations
 *   GET   /api/solutions/:id/evaluations
 *   GET   /api/solutions/:id/evaluations/summary
 *   PATCH /api/solutions/:id/status
 */

"use strict";

const express = require("express");

const {
    submitEvaluation,
    getEvaluations,
    getEvaluationSummary,
    updateStatus,
} = require("../controllers/solutionEvaluationController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

// POST /api/solutions/:id/evaluations
router.post(
    "/:id/evaluations",
    authenticate,
    authorizeRoles("AUTHORITY", "ADMIN"),
    submitEvaluation
);

// GET /api/solutions/:id/evaluations/summary
// Registered BEFORE /:id/evaluations to avoid any path ambiguity
router.get(
    "/:id/evaluations/summary",
    authenticate,
    getEvaluationSummary
);

// GET /api/solutions/:id/evaluations
router.get(
    "/:id/evaluations",
    authenticate,
    getEvaluations
);

// PATCH /api/solutions/:id/status
router.patch(
    "/:id/status",
    authenticate,
    authorizeRoles("AUTHORITY", "ADMIN"),
    updateStatus
);

module.exports = router;
