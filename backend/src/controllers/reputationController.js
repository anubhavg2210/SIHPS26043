/**
 * reputationController.js
 *
 * MODULE 14 — RANKINGS + REPUTATION + REWARDS
 *
 * HTTP Controller for:
 *   - /api/reputation/me
 *   - /api/users/:id/reputation
 *   - /api/users/:id/badges
 *   - /api/rankings
 *   - /api/rankings/users
 *   - /api/rankings/universities
 *   - /api/rankings/organizations
 */

"use strict";

const reputationService = require("../services/reputationService");

async function getMyReputation(req, res) {
    try {
        const rep = await reputationService.getUserReputation(req.user.id);
        if (!rep) {
            return res.status(404).json({ message: "Reputation profile not found" });
        }
        return res.status(200).json(rep);
    } catch (err) {
        console.error("reputationController.getMyReputation error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function getUserReputationById(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        const rep = await reputationService.getPublicUserReputation(id);
        if (!rep) {
            return res.status(404).json({ message: "User reputation profile not found" });
        }
        return res.status(200).json(rep);
    } catch (err) {
        console.error("reputationController.getUserReputationById error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function getUserBadgesById(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        const badges = await reputationService.getUserBadges(id);
        return res.status(200).json({ user_id: id, badges });
    } catch (err) {
        console.error("reputationController.getUserBadgesById error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function getRankingsOverview(req, res) {
    try {
        const [students, researchers, citizens, universities, orgs] = await Promise.all([
            reputationService.getUserLeaderboard({ role: "STUDENT", limit: 5 }),
            reputationService.getUserLeaderboard({ role: "RESEARCHER", limit: 5 }),
            reputationService.getUserLeaderboard({ role: "CITIZEN", limit: 5 }),
            reputationService.getUniversityLeaderboard({ limit: 5 }),
            reputationService.getOrganizationLeaderboard({ limit: 5 }),
        ]);

        return res.status(200).json({
            top_students: students.users,
            top_researchers: researchers.users,
            top_citizens: citizens.users,
            top_universities: universities.universities,
            top_organizations: orgs.organizations,
        });
    } catch (err) {
        console.error("reputationController.getRankingsOverview error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function getUserRankings(req, res) {
    try {
        const { role, district, tier, sort, page, limit } = req.query;
        const result = await reputationService.getUserLeaderboard({
            role,
            district,
            tier,
            sort,
            page,
            limit,
        });
        return res.status(200).json(result);
    } catch (err) {
        console.error("reputationController.getUserRankings error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function getUniversityRankings(req, res) {
    try {
        const { page, limit } = req.query;
        const result = await reputationService.getUniversityLeaderboard({ page, limit });
        return res.status(200).json(result);
    } catch (err) {
        console.error("reputationController.getUniversityRankings error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function getOrganizationRankings(req, res) {
    try {
        const { type, page, limit } = req.query;
        const result = await reputationService.getOrganizationLeaderboard({ type, page, limit });
        return res.status(200).json(result);
    } catch (err) {
        console.error("reputationController.getOrganizationRankings error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = {
    getMyReputation,
    getUserReputationById,
    getUserBadgesById,
    getRankingsOverview,
    getUserRankings,
    getUniversityRankings,
    getOrganizationRankings,
};
