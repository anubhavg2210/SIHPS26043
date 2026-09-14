/**
 * trustRoutes.js
 *
 * MODULE 16 — TRUST & ANTI-GAMING
 */

"use strict";

const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const { getTrustEvents, getTrustEventById, reviewTrustEvent } = require("../controllers/trustController");

router.use(authenticate);

router.get("/", getTrustEvents);
router.get("/:id", getTrustEventById);
router.patch("/:id/review", reviewTrustEvent);

module.exports = router;
