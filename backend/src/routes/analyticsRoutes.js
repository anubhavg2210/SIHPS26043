"use strict";

const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
const { authenticate } = require("../middleware/authMiddleware");

// All analytics are restricted to AUTHORITY and ADMIN
router.use(authenticate);
router.use((req, res, next) => {
    if (req.user.role !== "AUTHORITY" && req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "Forbidden" });
    }
    next();
});

router.get("/overview", analyticsController.getOverviewHandler);
router.get("/pipeline", analyticsController.getPipelineHandler);
router.get("/community", analyticsController.getCommunityHandler);
router.get("/trust", analyticsController.getTrustHandler);

module.exports = router;
