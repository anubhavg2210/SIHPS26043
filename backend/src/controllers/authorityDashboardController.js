/**
 * authorityDashboardController.js
 *
 * MODULE 3 — AUTHORITY DASHBOARD
 *
 * HTTP handlers for all dashboard endpoints.
 * All handlers require AUTHORITY or ADMIN role (enforced in routes).
 *
 * Response style follows the existing project convention:
 * direct JSON objects, no { success, data } wrapper.
 */

"use strict";

const {
    getSummary,
    getPriorityProblems,
    getProblems,
    getDistrictAnalytics,
    getStatusAnalytics,
    getClusterAnalytics,
    getRecentActivity,
    parseIntParam
} = require("../services/authorityDashboardService");

// ---------------------------------------------------------------------------
// GET /api/authority/dashboard/summary
// ---------------------------------------------------------------------------

async function summary(req, res) {
    try {
        const data = await getSummary();
        res.json(data);
    } catch (error) {
        console.error("Dashboard summary error:", error);
        res.status(500).json({ message: "Failed to load dashboard summary" });
    }
}

// ---------------------------------------------------------------------------
// GET /api/authority/dashboard/priority
// ---------------------------------------------------------------------------

async function priority(req, res) {
    try {
        let limit;

        try {
            limit = parseIntParam(req.query.limit, "limit", 1, 50) ?? 10;
        } catch (validationError) {
            return res.status(400).json({ message: validationError.message });
        }

        const problems = await getPriorityProblems(limit);
        res.json({ problems });

    } catch (error) {
        console.error("Dashboard priority error:", error);
        res.status(500).json({ message: "Failed to load priority problems" });
    }
}

// ---------------------------------------------------------------------------
// GET /api/authority/dashboard/problems
// ---------------------------------------------------------------------------

async function problems(req, res) {
    try {
        let limit, offset, min_priority, max_priority, cluster_id;

        try {
            limit        = parseIntParam(req.query.limit,        "limit",        1, 100) ?? 20;
            offset       = parseIntParam(req.query.offset,       "offset",       0, 1000000) ?? 0;
            min_priority = parseIntParam(req.query.min_priority, "min_priority", 0, 100);
            max_priority = parseIntParam(req.query.max_priority, "max_priority", 0, 100);
            cluster_id   = parseIntParam(req.query.cluster_id,   "cluster_id",   1, 2147483647);
        } catch (validationError) {
            return res.status(400).json({ message: validationError.message });
        }

        // Validate string filters only allow safe, non-empty values
        const { district, category, subcategory, status } = req.query;

        const result = await getProblems({
            district:     district     || undefined,
            category:     category     || undefined,
            subcategory:  subcategory  || undefined,
            status:       status       || undefined,
            min_priority,
            max_priority,
            cluster_id,
            limit,
            offset
        });

        res.json(result);

    } catch (error) {
        console.error("Dashboard problems error:", error);
        res.status(500).json({ message: "Failed to load problems" });
    }
}

// ---------------------------------------------------------------------------
// GET /api/authority/dashboard/districts
// ---------------------------------------------------------------------------

async function districts(req, res) {
    try {
        const data = await getDistrictAnalytics();
        res.json({ districts: data });
    } catch (error) {
        console.error("Dashboard districts error:", error);
        res.status(500).json({ message: "Failed to load district analytics" });
    }
}

// ---------------------------------------------------------------------------
// GET /api/authority/dashboard/status
// ---------------------------------------------------------------------------

async function statusAnalytics(req, res) {
    try {
        const data = await getStatusAnalytics();
        res.json({ statuses: data });
    } catch (error) {
        console.error("Dashboard status error:", error);
        res.status(500).json({ message: "Failed to load status analytics" });
    }
}

// ---------------------------------------------------------------------------
// GET /api/authority/dashboard/clusters
// ---------------------------------------------------------------------------

async function clusters(req, res) {
    try {
        const data = await getClusterAnalytics();
        res.json({ clusters: data });
    } catch (error) {
        console.error("Dashboard clusters error:", error);
        res.status(500).json({ message: "Failed to load cluster analytics" });
    }
}

// ---------------------------------------------------------------------------
// GET /api/authority/dashboard/recent
// ---------------------------------------------------------------------------

async function recent(req, res) {
    try {
        let limit;

        try {
            limit = parseIntParam(req.query.limit, "limit", 1, 50) ?? 10;
        } catch (validationError) {
            return res.status(400).json({ message: validationError.message });
        }

        const data = await getRecentActivity(limit);
        res.json({ problems: data });

    } catch (error) {
        console.error("Dashboard recent error:", error);
        res.status(500).json({ message: "Failed to load recent activity" });
    }
}

module.exports = {
    summary,
    priority,
    problems,
    districts,
    statusAnalytics,
    clusters,
    recent
};
