/**
 * studentRoutes.js
 *
 * Dedicated authenticated routes for Student workflows:
 * - Profile and skill competency management
 * - Personalized explainable problem matching
 */

"use strict";

const express = require("express");
const { authenticate } = require("../middleware/authMiddleware");
const {
    getStudentProfileHandler,
    updateStudentSkillsHandler,
    getStudentMatchedProblemsHandler,
} = require("../controllers/studentMatchingController");

const router = express.Router();

router.use(authenticate);

// GET /api/students/me/profile
router.get("/me/profile", getStudentProfileHandler);

// PUT /api/students/me/skills
router.put("/me/skills", updateStudentSkillsHandler);

// GET /api/students/me/matches
router.get("/me/matches", getStudentMatchedProblemsHandler);

module.exports = router;
