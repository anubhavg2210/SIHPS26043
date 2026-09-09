/**
 * dependencyRoutes.js
 *
 * MODULE 12 — PROBLEM DEPENDENCY MAPPING ROUTER
 */

"use strict";

const express = require("express");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const {
    getDependencyByIdHandler,
    updateDependencyHandler,
    deleteDependencyHandler,
    verifyDependencyHandler,
    getCriticalPathsHandler,
} = require("../controllers/dependencyController");

const router = express.Router();

// GET /api/dependencies/critical-paths
// (Mounted before :id to prevent Express route matching conflict)
router.get(
    "/critical-paths",
    authenticate,
    getCriticalPathsHandler
);

// GET /api/dependencies/:id
router.get(
    "/:id",
    authenticate,
    getDependencyByIdHandler
);

// PATCH /api/dependencies/:id
router.patch(
    "/:id",
    authenticate,
    updateDependencyHandler
);

// DELETE /api/dependencies/:id
router.delete(
    "/:id",
    authenticate,
    deleteDependencyHandler
);

// PATCH /api/dependencies/:id/verify
router.patch(
    "/:id/verify",
    authenticate,
    authorizeRoles("AUTHORITY", "ADMIN"),
    verifyDependencyHandler
);

module.exports = router;
