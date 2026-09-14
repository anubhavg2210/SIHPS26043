/**
 * trustController.js
 *
 * MODULE 16 — TRUST & ANTI-GAMING
 *
 * Exposes trust audit logs for authority review.
 */

"use strict";

const pool = require("../config/db");

async function getTrustEvents(req, res) {
    if (!["AUTHORITY", "ADMIN"].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
    }
    try {
        const { status, limit = 50, page = 1 } = req.query;
        const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
        
        let query = `
            SELECT t.*, u.name as user_name, u.role as user_role 
            FROM trust_events t
            JOIN users u ON t.user_id = u.id
        `;
        const params = [];
        let countQuery = `SELECT COUNT(*) FROM trust_events`;
        const countParams = [];

        if (status) {
            params.push(status);
            countParams.push(status);
            query += ` WHERE t.status = $1 `;
            countQuery += ` WHERE status = $1 `;
        }
        
        query += ` ORDER BY t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit, 10), offset);
        
        const [eventsRes, countRes] = await Promise.all([
            pool.query(query, params),
            pool.query(countQuery, countParams)
        ]);
        
        res.json({
            events: eventsRes.rows,
            total: parseInt(countRes.rows[0].count, 10),
            page: parseInt(page, 10),
            limit: parseInt(limit, 10)
        });
    } catch (err) {
        console.error("Error fetching trust events:", err);
        res.status(500).json({ message: "Failed to fetch trust events" });
    }
}

async function getTrustEventById(req, res) {
    if (!["AUTHORITY", "ADMIN"].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
    }
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    try {
        const query = `
            SELECT t.*, u.name as user_name, u.role as user_role 
            FROM trust_events t
            JOIN users u ON t.user_id = u.id
            WHERE t.id = $1
        `;
        const resDb = await pool.query(query, [id]);
        if (resDb.rows.length === 0) {
            return res.status(404).json({ message: "Trust event not found" });
        }
        res.json(resDb.rows[0]);
    } catch (err) {
        console.error("Error fetching trust event:", err);
        res.status(500).json({ message: "Failed to fetch trust event" });
    }
}

async function reviewTrustEvent(req, res) {
    if (!["AUTHORITY", "ADMIN"].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
    }
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const { remarks } = req.body;
    const reviewerId = req.user.id;

    try {
        const updateRes = await pool.query(
            `UPDATE trust_events 
             SET status = 'REVIEWED', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, reviewer_remarks = $2
             WHERE id = $3
             RETURNING *`,
            [reviewerId, remarks || null, id]
        );

        if (updateRes.rows.length === 0) {
            return res.status(404).json({ message: "Trust event not found" });
        }

        res.json({
            message: "Trust event reviewed successfully",
            event: updateRes.rows[0]
        });
    } catch (err) {
        console.error("Error reviewing trust event:", err);
        res.status(500).json({ message: "Failed to review trust event" });
    }
}

module.exports = {
    getTrustEvents,
    getTrustEventById,
    reviewTrustEvent
};
