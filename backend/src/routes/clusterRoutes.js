/**
 * clusterRoutes.js
 *
 * Routes for MODULE 2 — PROBLEM CLUSTERING cluster-level endpoints.
 *
 * Mounted at: /api/clusters
 */

"use strict";

const express = require("express");

const {
    getClusterDetail
} = require("../controllers/clusteringController");

const {
    authenticate
} = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/clusters/:id
router.get(
    "/:id",
    authenticate,
    getClusterDetail
);

module.exports = router;
