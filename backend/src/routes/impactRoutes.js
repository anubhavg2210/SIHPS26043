/**
 * impactRoutes.js
 *
 * MODULE 10 — IMPACT TRACKING ROUTES
 *
 * Mounted at /api/impact-assessments
 */

"use strict";

const express = require("express");

const {
    getImpactAssessmentHandler,
    updateImpactAssessmentHandler,
    addMetricHandler,
    updateMetricHandler,
    getComparisonHandler,
    submitFeedbackHandler,
    getFeedbackHandler,
    verifyHandler,
    markSustainedHandler,
} = require("../controllers/impactController");

const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/impact-assessments/:id/comparison
// Mounted before /:id to prevent routing collision
router.get(
    "/:id/comparison",
    authenticate,
    getComparisonHandler
);

// GET /api/impact-assessments/:id/feedback
router.get(
    "/:id/feedback",
    authenticate,
    getFeedbackHandler
);

// POST /api/impact-assessments/:id/feedback
router.post(
    "/:id/feedback",
    authenticate,
    submitFeedbackHandler
);

// POST /api/impact-assessments/:id/metrics
router.post(
    "/:id/metrics",
    authenticate,
    addMetricHandler
);

// PATCH /api/impact-assessments/:id/metrics/:mId
router.patch(
    "/:id/metrics/:mId",
    authenticate,
    updateMetricHandler
);

// PATCH /api/impact-assessments/:id/verify
router.patch(
    "/:id/verify",
    authenticate,
    verifyHandler
);

// PATCH /api/impact-assessments/:id/sustained
router.patch(
    "/:id/sustained",
    authenticate,
    markSustainedHandler
);

// GET /api/impact-assessments/:id
router.get(
    "/:id",
    authenticate,
    getImpactAssessmentHandler
);

// PATCH /api/impact-assessments/:id
router.patch(
    "/:id",
    authenticate,
    updateImpactAssessmentHandler
);

module.exports = router;
