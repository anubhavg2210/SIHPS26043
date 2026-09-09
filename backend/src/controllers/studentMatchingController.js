/**
 * studentMatchingController.js
 *
 * MODULE 5 — STUDENT MATCHING
 *
 * HTTP handler for GET /api/problems/:id/student-matches
 */

"use strict";

const {
    findStudentMatches,
    parseIntParam
} = require("../services/studentMatchingService");

// ---------------------------------------------------------------------------
// GET /api/problems/:id/student-matches
// ---------------------------------------------------------------------------

async function getStudentMatches(req, res) {
    const problemId = parseInt(req.params.id, 10);

    if (isNaN(problemId)) {
        return res.status(400).json({ message: "Invalid problem id" });
    }

    let limit;

    try {
        limit = parseIntParam(req.query.limit, "limit", 1, 50) ?? 10;
    } catch (validationError) {
        return res.status(400).json({ message: validationError.message });
    }

    try {
        const result = await findStudentMatches(problemId, { limit });

        if (result === null) {
            return res.status(404).json({ message: "Problem not found" });
        }

        res.json({
            problem_id: problemId,
            required_expertise: result.required_expertise,
            matches: result.matches
        });

    } catch (error) {
        console.error("Student matching error:", error);

        res.status(500).json({
            message: "Failed to fetch student matches"
        });
    }
}

module.exports = {
    getStudentMatches
};
