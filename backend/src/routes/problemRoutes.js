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