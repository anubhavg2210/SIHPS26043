/**
 * implementationRoutes.js
 *
 * MODULE 9 — IMPLEMENTATION + PILOT TRACKING ROUTES
 *
 * Mounted at /api/implementations
 */

"use strict";

const express = require("express");

const {
    getImplementation,
    updateStatusHandler,
    updateProgressHandler,
    addMilestoneHandler,
    updateMilestoneHandler,
    addUpdateHandler,
    getUpdatesHandler,
    addEvidenceHandler,
    getEvidenceHandler,
    verifyEvidenceHandler,
    raiseBlockerHandler,
    resolveBlockerHandler,
} = require("../controllers/implementationController");

const {
    createImpactAssessmentHandler,
    getImpactAssessmentByImplementationHandler,
} = require("../controllers/impactController");

const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

// Module 10 Impact Assessment Endpoints for Implementation
// POST /api/implementations/:id/impact
router.post(
    "/:id/impact",
    authenticate,
    createImpactAssessmentHandler
);

// GET /api/implementations/:id/impact
router.get(
    "/:id/impact",
    authenticate,
    getImpactAssessmentByImplementationHandler
);

// GET /api/implementations/:id
router.get(
    "/:id",
    authenticate,
    getImplementation
);


// PATCH /api/implementations/:id/status
router.patch(
    "/:id/status",
    authenticate,
    updateStatusHandler
);

// PATCH /api/implementations/:id/progress
router.patch(
    "/:id/progress",
    authenticate,
    updateProgressHandler
);

// Milestones
router.post(
    "/:id/milestones",
    authenticate,
    addMilestoneHandler
);

router.patch(
    "/:id/milestones/:mId",
    authenticate,
    updateMilestoneHandler
);

// Updates & Activity Feed
router.post(
    "/:id/updates",
    authenticate,
    addUpdateHandler
);

router.get(
    "/:id/updates",
    authenticate,
    getUpdatesHandler
);

// Evidence
router.post(
    "/:id/evidence",
    authenticate,
    addEvidenceHandler
);

router.get(
    "/:id/evidence",
    authenticate,
    getEvidenceHandler
);

router.patch(
    "/:id/evidence/:evidenceId/verify",
    authenticate,
    verifyEvidenceHandler
);

// Blockers
router.post(
    "/:id/blockers",
    authenticate,
    raiseBlockerHandler
);

router.patch(
    "/:id/blockers/:bId/resolve",
    authenticate,
    resolveBlockerHandler
);

module.exports = router;
