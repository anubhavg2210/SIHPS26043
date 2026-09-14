/**
 * teamRoutes.js
 *
 * MODULE 9 — COLLABORATION TEAM ROUTES
 *
 * All routes require authentication.
 * Lead-specific actions are enforced inside the service layer.
 */

"use strict";

const express = require("express");
const { authenticate } = require("../middleware/authMiddleware");

const {
    createTeamHandler,
    getTeamHandler,
    inviteMemberHandler,
    acceptInvitationHandler,
    declineInvitationHandler,
    removeMemberHandler,
    updateTeamStatusHandler,
} = require("../controllers/collaborationController");

const router = express.Router();

// POST /api/teams — create a team
router.post("/", authenticate, createTeamHandler);

// GET /api/teams/:id — get team details
router.get("/:id", authenticate, getTeamHandler);

// POST /api/teams/:id/invite — invite a member (LEAD only, enforced in service)
router.post("/:id/invite", authenticate, inviteMemberHandler);

// POST /api/teams/:id/accept — accept invitation
router.post("/:id/accept", authenticate, acceptInvitationHandler);

// POST /api/teams/:id/decline — decline invitation
router.post("/:id/decline", authenticate, declineInvitationHandler);

// DELETE /api/teams/:id/members/:userId — remove a member
router.delete("/:id/members/:userId", authenticate, removeMemberHandler);

// PATCH /api/teams/:id/status — update team status
router.patch("/:id/status", authenticate, updateTeamStatusHandler);

module.exports = router;
