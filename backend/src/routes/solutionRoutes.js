const express = require("express");

const {
    getSolution,
} = require("../controllers/solutionController");

const {
    createImplementation,
    getSolutionImplementation,
} = require("../controllers/implementationController");

const solutionEvaluationRoutes = require("./solutionEvaluationRoutes");

const {
    authenticate,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Module 8: Evaluation & Status Routes
router.use("/", solutionEvaluationRoutes);

// Module 9: Implementation Endpoints for Solution
// POST /api/solutions/:id/implementations
router.post(
    "/:id/implementations",
    authenticate,
    createImplementation
);

// GET /api/solutions/:id/implementation
router.get(
    "/:id/implementation",
    authenticate,
    getSolutionImplementation
);

// GET /api/solutions/:id
router.get(
    "/:id",
    authenticate,
    getSolution
);

module.exports = router;


