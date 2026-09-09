/**
 * rootCauseRoutes.js
 *
 * MODULE 11 — ROOT CAUSE ANALYSIS ROUTES
 *
 * Mounted at /api/root-causes
 */

"use strict";

const express = require("express");

const {
    getRootCauseByIdHandler,
    updateRootCauseHandler,
    addEvidenceHandler,
    getRootCauseEvidenceHandler,
    verifyRootCauseHandler,
} = require("../controllers/rootCauseController");

const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

// POST /api/root-causes/:id/evidence
router.post(
    "/:id/evidence",
    authenticate,
    addEvidenceHandler
);

// GET /api/root-causes/:id/evidence
router.get(
    "/:id/evidence",
    authenticate,
    getRootCauseEvidenceHandler
);

// PATCH /api/root-causes/:id/verify
router.patch(
    "/:id/verify",
    authenticate,
    verifyRootCauseHandler
);

// GET /api/root-causes/:id
router.get(
    "/:id",
    authenticate,
    getRootCauseByIdHandler
);

// PATCH /api/root-causes/:id
router.patch(
    "/:id",
    authenticate,
    updateRootCauseHandler
);

module.exports = router;
