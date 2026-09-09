/**
 * reputationRoutes.js
 *
 * MODULE 14 — RANKINGS + REPUTATION + REWARDS
 *
 * Routes for reputation, user badges, and public leaderboards.
 */

"use strict";

const express = require("express");
const { authenticate } = require("../middleware/authMiddleware");
const reputationController = require("../controllers/reputationController");

// /api/reputation
const reputationRouter = express.Router();
reputationRouter.use(authenticate);
reputationRouter.get("/me", reputationController.getMyReputation);

// /api/rankings
const rankingsRouter = express.Router();
rankingsRouter.use(authenticate);
rankingsRouter.get("/", reputationController.getRankingsOverview);
rankingsRouter.get("/users", reputationController.getUserRankings);
rankingsRouter.get("/universities", reputationController.getUniversityRankings);
rankingsRouter.get("/organizations", reputationController.getOrganizationRankings);

// /api/users
const usersRouter = express.Router();
usersRouter.use(authenticate);
usersRouter.get("/:id/reputation", reputationController.getUserReputationById);
usersRouter.get("/:id/badges", reputationController.getUserBadgesById);

module.exports = {
    reputationRouter,
    rankingsRouter,
    usersRouter,
};
