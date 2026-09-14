/**
 * collaborationController.js
 *
 * MODULE 9 — COLLABORATION TEAMS
 *
 * HTTP handlers — thin layer that delegates to collaborationService.
 * Error handling consistent with existing controllers (communityController, solutionController).
 */

"use strict";

const {
    ValidationError,
    ForbiddenError,
    NotFoundError,
    createTeam,
    getTeamById,
    getTeamsForProblem,
    inviteMember,
    acceptInvitation,
    declineInvitation,
    removeMember,
    updateTeamStatus,
} = require("../services/collaborationService");

// ---------------------------------------------------------------------------
// Shared error handler (consistent with other controllers)
// ---------------------------------------------------------------------------

function handleError(err, res, fallbackMessage) {
    if (err instanceof ValidationError || err.name === "ValidationError") {
        return res.status(400).json({ message: err.message });
    }
    if (err instanceof ForbiddenError || err.name === "ForbiddenError") {
        return res.status(403).json({ message: err.message });
    }
    if (err instanceof NotFoundError || err.name === "NotFoundError") {
        return res.status(404).json({ message: err.message });
    }
    console.error(fallbackMessage, err);
    return res.status(500).json({ message: fallbackMessage });
}

// ---------------------------------------------------------------------------
// POST /api/teams
// ---------------------------------------------------------------------------

async function createTeamHandler(req, res) {
    try {
        const { problemId, name } = req.body;
        const team = await createTeam(req.user.id, { problemId, name });
        res.status(201).json({ message: "Team created successfully", team });
    } catch (err) {
        handleError(err, res, "Failed to create team");
    }
}

// ---------------------------------------------------------------------------
// GET /api/teams/:id
// ---------------------------------------------------------------------------

async function getTeamHandler(req, res) {
    const teamId = parseInt(req.params.id, 10);
    if (isNaN(teamId)) {
        return res.status(400).json({ message: "Invalid team ID" });
    }
    try {
        const team = await getTeamById(teamId);
        res.status(200).json({ team });
    } catch (err) {
        handleError(err, res, "Failed to retrieve team");
    }
}

// ---------------------------------------------------------------------------
// GET /api/problems/:id/teams
// ---------------------------------------------------------------------------

async function listTeamsForProblemHandler(req, res) {
    const problemId = parseInt(req.params.id, 10);
    if (isNaN(problemId)) {
        return res.status(400).json({ message: "Invalid problem ID" });
    }
    try {
        const teams = await getTeamsForProblem(problemId);
        res.status(200).json({ problem_id: problemId, teams });
    } catch (err) {
        handleError(err, res, "Failed to list teams");
    }
}

// ---------------------------------------------------------------------------
// POST /api/teams/:id/invite
// ---------------------------------------------------------------------------

async function inviteMemberHandler(req, res) {
    const teamId = parseInt(req.params.id, 10);
    if (isNaN(teamId)) {
        return res.status(400).json({ message: "Invalid team ID" });
    }
    try {
        const { userId, role } = req.body;
        const member = await inviteMember(teamId, req.user.id, { userId, role });
        res.status(201).json({ message: "Invitation sent", member });
    } catch (err) {
        handleError(err, res, "Failed to send invitation");
    }
}

// ---------------------------------------------------------------------------
// POST /api/teams/:id/accept
// ---------------------------------------------------------------------------

async function acceptInvitationHandler(req, res) {
    const teamId = parseInt(req.params.id, 10);
    if (isNaN(teamId)) {
        return res.status(400).json({ message: "Invalid team ID" });
    }
    try {
        const member = await acceptInvitation(teamId, req.user.id);
        res.status(200).json({ message: "Invitation accepted", member });
    } catch (err) {
        handleError(err, res, "Failed to accept invitation");
    }
}

// ---------------------------------------------------------------------------
// POST /api/teams/:id/decline
// ---------------------------------------------------------------------------

async function declineInvitationHandler(req, res) {
    const teamId = parseInt(req.params.id, 10);
    if (isNaN(teamId)) {
        return res.status(400).json({ message: "Invalid team ID" });
    }
    try {
        const member = await declineInvitation(teamId, req.user.id);
        res.status(200).json({ message: "Invitation declined", member });
    } catch (err) {
        handleError(err, res, "Failed to decline invitation");
    }
}

// ---------------------------------------------------------------------------
// DELETE /api/teams/:id/members/:userId
// ---------------------------------------------------------------------------

async function removeMemberHandler(req, res) {
    const teamId = parseInt(req.params.id, 10);
    const targetUserId = parseInt(req.params.userId, 10);
    if (isNaN(teamId) || isNaN(targetUserId)) {
        return res.status(400).json({ message: "Invalid team or user ID" });
    }
    try {
        const result = await removeMember(teamId, req.user.id, targetUserId);
        res.status(200).json(result);
    } catch (err) {
        handleError(err, res, "Failed to remove member");
    }
}

// ---------------------------------------------------------------------------
// PATCH /api/teams/:id/status
// ---------------------------------------------------------------------------

async function updateTeamStatusHandler(req, res) {
    const teamId = parseInt(req.params.id, 10);
    if (isNaN(teamId)) {
        return res.status(400).json({ message: "Invalid team ID" });
    }
    try {
        const { status } = req.body;
        const team = await updateTeamStatus(teamId, req.user.id, status);
        res.status(200).json({ message: "Team status updated", team });
    } catch (err) {
        handleError(err, res, "Failed to update team status");
    }
}

module.exports = {
    createTeamHandler,
    getTeamHandler,
    listTeamsForProblemHandler,
    inviteMemberHandler,
    acceptInvitationHandler,
    declineInvitationHandler,
    removeMemberHandler,
    updateTeamStatusHandler,
};
