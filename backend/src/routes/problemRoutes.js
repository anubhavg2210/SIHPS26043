const express = require("express");

const {
    createProblem,
    getProblems,
    getProblemById,
    getMyProblems,
    updateProblemStatus,
    getProblemStatusHistory,
    getDuplicates
} = require("../controllers/problemController");

const {
    getProblemCluster,
    triggerClustering
} = require("../controllers/clusteringController");

const {
    getFacultyMatches
} = require("../controllers/facultyMatchingController");

const {
    getStudentMatches
} = require("../controllers/studentMatchingController");

const {
    getResearcherMatches
} = require("../controllers/researcherMatchingController");

const {
    getStartupMatches,
    getMsmMatches
} = require("../controllers/innovationMatchingController");

const {
    createSolution,
    getSolutions
} = require("../controllers/solutionController");

const {
    getRankedSolutions
} = require("../controllers/solutionEvaluationController");

const {
    getProblemImplementations
} = require("../controllers/implementationController");

const {
    getProblemImpactSummaryHandler
} = require("../controllers/impactController");

const {
    analyzeRootCausesHandler,
    createRootCauseHandler,
    getProblemRootCausesHandler,
    getProblemRootCausesSummaryHandler,
} = require("../controllers/rootCauseController");

const {
    detectDependenciesHandler,
    createDependencyHandler,
    getProblemDependenciesHandler,
    getDependencyGraphHandler,
    getImpactChainHandler,
} = require("../controllers/dependencyController");

const {
    authenticate
} = require("../middleware/authMiddleware");

const {
    authorizeRoles
} = require("../middleware/roleMiddleware");

const router = express.Router();



router.post(
    "/",
    authenticate,
    authorizeRoles("CITIZEN"),
    createProblem
);

router.get(
    "/",
    authenticate,
    getProblems
);

router.get(
    "/mine",
    authenticate,
    authorizeRoles("CITIZEN"),
    getMyProblems
);

// GET /api/problems/:id/duplicates
// Must be registered BEFORE /:id to avoid Express matching 'duplicates'
// as the :id param.
router.get(
    "/:id/duplicates",
    authenticate,
    getDuplicates
);

// GET /api/problems/:id/cluster
router.get(
    "/:id/cluster",
    authenticate,
    getProblemCluster
);

// POST /api/problems/:id/cluster — manually trigger / re-run clustering.
// Restricted to AUTHORITY and ADMIN so citizens cannot spam re-clustering.
router.post(
    "/:id/cluster",
    authenticate,
    authorizeRoles("AUTHORITY", "ADMIN"),
    triggerClustering
);

// GET /api/problems/:id/faculty-matches
router.get(
    "/:id/faculty-matches",
    authenticate,
    getFacultyMatches
);

// GET /api/problems/:id/student-matches
router.get(
    "/:id/student-matches",
    authenticate,
    getStudentMatches
);

// GET /api/problems/:id/researcher-matches
router.get(
    "/:id/researcher-matches",
    authenticate,
    getResearcherMatches
);

// GET /api/problems/:id/startup-matches
router.get(
    "/:id/startup-matches",
    authenticate,
    getStartupMatches
);

// GET /api/problems/:id/msme-matches
router.get(
    "/:id/msme-matches",
    authenticate,
    getMsmMatches
);

// GET /api/problems/:id/solutions
router.get(
    "/:id/solutions",
    authenticate,
    getSolutions
);

// POST /api/problems/:id/solutions
router.post(
    "/:id/solutions",
    authenticate,
    createSolution
);

// GET /api/problems/:id/solutions/ranked
router.get(
    "/:id/solutions/ranked",
    authenticate,
    getRankedSolutions
);

// GET /api/problems/:id/implementations
router.get(
    "/:id/implementations",
    authenticate,
    getProblemImplementations
);

// GET /api/problems/:id/impact-summary
router.get(
    "/:id/impact-summary",
    authenticate,
    getProblemImpactSummaryHandler
);

// POST /api/problems/:id/root-causes/analyze
router.post(
    "/:id/root-causes/analyze",
    authenticate,
    analyzeRootCausesHandler
);

// POST /api/problems/:id/root-causes
router.post(
    "/:id/root-causes",
    authenticate,
    createRootCauseHandler
);

// GET /api/problems/:id/root-causes
router.get(
    "/:id/root-causes",
    authenticate,
    getProblemRootCausesHandler
);

// GET /api/problems/:id/root-causes/summary
router.get(
    "/:id/root-causes/summary",
    authenticate,
    getProblemRootCausesSummaryHandler
);

// POST /api/problems/:id/dependencies/detect
router.post(
    "/:id/dependencies/detect",
    authenticate,
    detectDependenciesHandler
);

// POST /api/problems/:id/dependencies
router.post(
    "/:id/dependencies",
    authenticate,
    createDependencyHandler
);

// GET /api/problems/:id/dependencies
router.get(
    "/:id/dependencies",
    authenticate,
    getProblemDependenciesHandler
);

// GET /api/problems/:id/dependency-graph
router.get(
    "/:id/dependency-graph",
    authenticate,
    getDependencyGraphHandler
);

// GET /api/problems/:id/impact-chain
router.get(
    "/:id/impact-chain",
    authenticate,
    getImpactChainHandler
);

router.get(
    "/:id",
    authenticate,
    getProblemById
);

router.patch(
    "/:id/status",
    authenticate,
    authorizeRoles("AUTHORITY", "ADMIN"),
    updateProblemStatus
);

router.get(
    "/:id/status-history",
    authenticate,
    getProblemStatusHistory
);

module.exports = router;