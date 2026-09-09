/**
 * notificationService.js
 *
 * MODULE 13 — SMART NOTIFICATION SERVICE
 *
 * Core Principles:
 *   1. Recipient resolution from existing database relationships.
 *   2. Actor exclusion centrally enforced: actor_user_id is never sent a self-notification.
 *   3. Deterministic anti-spam & deduplication with 15-minute cooldown.
 *   4. CRITICAL notifications bypass cooldown only when new diagnostic fingerprint exists.
 *   5. Non-blocking error boundary: dispatch failures never fail business operations.
 *   6. Strict relative action URLs.
 *   7. Absolute IDOR isolation: users can only view, read, or delete their own notifications.
 */

"use strict";

const crypto = require("crypto");
const pool = require("../config/db");

// ---------------------------------------------------------------------------
// Custom Errors
// ---------------------------------------------------------------------------

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValidationError";
    }
}

class ForbiddenError extends Error {
    constructor(message) {
        super(message);
        this.name = "ForbiddenError";
    }
}

class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = "NotFoundError";
    }
}

// ---------------------------------------------------------------------------
// Constants & Configuration
// ---------------------------------------------------------------------------

const VALID_PRIORITIES = ["LOW", "NORMAL", "HIGH", "CRITICAL"];

const COOLDOWN_INTERVAL_MINUTES = 15;

/**
 * Validates that an action URL is a safe, relative frontend path.
 * Disallows arbitrary external protocols, javascript:, etc.
 */
function isValidActionUrl(url) {
    if (!url) return true; // Optional field
    if (typeof url !== "string") return false;
    // Must start with '/' and contain only safe URL characters
    return /^\/[a-zA-Z0-9/_?=&%-]*$/.test(url.trim());
}

/**
 * Generates an MD5 deduplication key incorporating the fingerprint.
 */
function generateDedupKey(recipientId, eventType, entityType, entityId, fingerprint = "") {
    const raw = `${recipientId}:${eventType}:${entityType}:${entityId}:${fingerprint || ""}`;
    return crypto.createHash("md5").update(raw).digest("hex");
}

// ---------------------------------------------------------------------------
// 1. Recipient Resolution Engine (Reusing Existing Relational Assets)
// ---------------------------------------------------------------------------

async function resolveRecipients({ eventType, entityType, entityId, explicitRecipientIds = [] }) {
    if (explicitRecipientIds && explicitRecipientIds.length > 0) {
        return Array.from(new Set(
            explicitRecipientIds.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id))
        ));
    }

    const recipientSet = new Set();

    try {
        switch (entityType) {
            case "PROBLEM": {
                const pRes = await pool.query(
                    "SELECT reporter_id, district FROM problems WHERE id = $1",
                    [entityId]
                );
                if (pRes.rows.length > 0) {
                    const prob = pRes.rows[0];

                    if (["PROBLEM_VERIFIED", "PROBLEM_STATUS_CHANGED"].includes(eventType)) {
                        if (prob.reporter_id) recipientSet.add(prob.reporter_id);
                    }

                    if (["PROBLEM_REPORTED", "ROOT_CAUSE_PROPOSED", "SOLUTION_SUBMITTED"].includes(eventType)) {
                        // Notify district authorities
                        const authRes = await pool.query(
                            `SELECT user_id FROM authority_profiles
                             WHERE district = $1 OR district IS NULL`,
                            [prob.district]
                        );
                        authRes.rows.forEach((r) => recipientSet.add(r.user_id));
                    }
                }
                break;
            }

            case "SOLUTION": {
                const sRes = await pool.query(
                    `SELECT s.submitted_by, s.problem_id, p.district
                     FROM solutions s
                     JOIN problems p ON p.id = s.problem_id
                     WHERE s.id = $1`,
                    [entityId]
                );
                if (sRes.rows.length > 0) {
                    const sol = sRes.rows[0];

                    // Submitter and contributors
                    if (["SOLUTION_EVALUATED", "SOLUTION_APPROVED", "SOLUTION_REJECTED"].includes(eventType)) {
                        if (sol.submitted_by) recipientSet.add(sol.submitted_by);
                        const cRes = await pool.query(
                            "SELECT user_id FROM solution_contributors WHERE solution_id = $1",
                            [entityId]
                        );
                        cRes.rows.forEach((r) => recipientSet.add(r.user_id));
                    }

                    // Authority overseers
                    if (["SOLUTION_SUBMITTED"].includes(eventType)) {
                        const authRes = await pool.query(
                            "SELECT user_id FROM authority_profiles WHERE district = $1 OR district IS NULL",
                            [sol.district]
                        );
                        authRes.rows.forEach((r) => recipientSet.add(r.user_id));
                    }
                }
                break;
            }

            case "IMPLEMENTATION": {
                const iRes = await pool.query(
                    `SELECT si.lead_authority_id, si.executing_user_id, si.solution_id
                     FROM solution_implementations si
                     WHERE si.id = $1`,
                    [entityId]
                );
                if (iRes.rows.length > 0) {
                    const impl = iRes.rows[0];
                    if (impl.lead_authority_id) recipientSet.add(impl.lead_authority_id);
                    if (impl.executing_user_id) recipientSet.add(impl.executing_user_id);

                    if (["IMPLEMENTATION_RESUMED", "IMPLEMENTATION_COMPLETED"].includes(eventType)) {
                        const cRes = await pool.query(
                            "SELECT user_id FROM solution_contributors WHERE solution_id = $1",
                            [impl.solution_id]
                        );
                        cRes.rows.forEach((r) => recipientSet.add(r.user_id));
                    }
                }
                break;
            }

            case "ROOT_CAUSE": {
                const rcRes = await pool.query(
                    "SELECT proposed_by, problem_id FROM root_causes WHERE id = $1",
                    [entityId]
                );
                if (rcRes.rows.length > 0) {
                    const rc = rcRes.rows[0];
                    if (["ROOT_CAUSE_VERIFIED", "ROOT_CAUSE_REJECTED"].includes(eventType)) {
                        if (rc.proposed_by) recipientSet.add(rc.proposed_by);
                    }
                }
                break;
            }

            case "DEPENDENCY": {
                const depRes = await pool.query(
                    `SELECT pd.problem_id, pd.created_by, p.district
                     FROM problem_dependencies pd
                     JOIN problems p ON p.id = pd.problem_id
                     WHERE pd.id = $1`,
                    [entityId]
                );
                if (depRes.rows.length > 0) {
                    const dep = depRes.rows[0];
                    if (["DEPENDENCY_VERIFIED"].includes(eventType)) {
                        if (dep.created_by) recipientSet.add(dep.created_by);
                    }

                    if (["CRITICAL_DEPENDENCY_DETECTED"].includes(eventType)) {
                        // Notify solution submitters on the downstream blocked problem
                        const solRes = await pool.query(
                            "SELECT submitted_by FROM solutions WHERE problem_id = $1",
                            [dep.problem_id]
                        );
                        solRes.rows.forEach((r) => recipientSet.add(r.submitted_by));

                        const authRes = await pool.query(
                            "SELECT user_id FROM authority_profiles WHERE district = $1 OR district IS NULL",
                            [dep.district]
                        );
                        authRes.rows.forEach((r) => recipientSet.add(r.user_id));
                    }
                }
                break;
            }

            default:
                break;
        }
    } catch (resErr) {
        console.error("Recipient resolution fallback warning:", resErr);
    }

    return Array.from(recipientSet);
}

// ---------------------------------------------------------------------------
// 2. Core Notification Dispatch Engine
// ---------------------------------------------------------------------------

/**
 * Dispatches a smart notification across resolved recipients.
 * Enforces:
 *   - Central Actor Exclusion (Mandatory Fix 2)
 *   - Deduplication & Cooldown with Critical Exemption (Mandatory Fix 1 & 5)
 *   - Action URL Relative Path Validation (Mandatory Fix 4)
 *   - Non-Blocking Failure Isolation (Mandatory Fix 3)
 */
async function notify({
    eventType,
    entityType,
    entityId,
    actorUserId = null,
    title,
    message,
    priority = "NORMAL",
    actionUrl = null,
    metadata = {},
    fingerprint = "",
    recipientUserIds = [],
}) {
    // Non-blocking try-catch boundary
    try {
        if (!eventType || !entityType || !entityId) {
            return { sent_count: 0, reason: "Missing required event identity parameters" };
        }

        const cleanPriority = VALID_PRIORITIES.includes(priority) ? priority : "NORMAL";

        if (actionUrl && !isValidActionUrl(actionUrl)) {
            actionUrl = null; // Purge invalid external URLs
        }

        // 1. Resolve recipients
        const candidateRecipients = await resolveRecipients({
            eventType,
            entityType,
            entityId,
            explicitRecipientIds: recipientUserIds,
        });

        // 2. Central Actor Exclusion Invariant (Mandatory Fix 2)
        const finalRecipients = candidateRecipients.filter(
            (id) => actorUserId === null || Number(id) !== Number(actorUserId)
        );

        if (finalRecipients.length === 0) {
            return { sent_count: 0, recipient_count: 0, notifications: [] };
        }

        const createdNotifications = [];

        for (const recipientId of finalRecipients) {
            const dedupKey = generateDedupKey(
                recipientId,
                eventType,
                entityType,
                entityId,
                fingerprint
            );

            // 3. Deduplication Check with Cooldown (Mandatory Fix 1 & 5)
            // Check if identical dedup_key was dispatched in the last 15 minutes
            const dupCheck = await pool.query(
                `SELECT id, priority FROM notifications
                 WHERE dedup_key = $1
                   AND created_at > (CURRENT_TIMESTAMP - INTERVAL '${COOLDOWN_INTERVAL_MINUTES} minutes')
                 LIMIT 1`,
                [dedupKey]
            );

            if (dupCheck.rows.length > 0) {
                // Suppress duplicate within cooldown window
                continue;
            }

            // 4. Database Insertion
            const insertRes = await pool.query(
                `INSERT INTO notifications
                    (recipient_user_id, actor_user_id, event_type, title, message,
                     entity_type, entity_id, priority, action_url, metadata, dedup_key)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                 RETURNING *`,
                [
                    recipientId,
                    actorUserId,
                    eventType,
                    title,
                    message,
                    entityType,
                    entityId,
                    cleanPriority,
                    actionUrl,
                    JSON.stringify(metadata || {}),
                    dedupKey,
                ]
            );

            if (insertRes.rows.length > 0) {
                createdNotifications.push(formatNotification(insertRes.rows[0]));
            }
        }

        return {
            sent_count: createdNotifications.length,
            recipient_count: finalRecipients.length,
            notifications: createdNotifications,
        };
    } catch (dispatchErr) {
        // Non-blocking fault tolerance (Mandatory Fix 3)
        console.error("Non-fatal notification dispatch error:", dispatchErr.message);
        return { sent_count: 0, error: dispatchErr.message };
    }
}

// ---------------------------------------------------------------------------
// 3. Consumer & Read Lifecycle Operations (IDOR Protected)
// ---------------------------------------------------------------------------

async function getUserNotifications(userId, { isRead = null, priority = null, page = 1, limit = 20 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const conditions = ["n.recipient_user_id = $1"];
    const params = [userId];

    if (isRead !== null && isRead !== undefined && isRead !== "") {
        params.push(String(isRead).toLowerCase() === "true");
        conditions.push(`n.is_read = $${params.length}`);
    }

    if (priority && VALID_PRIORITIES.includes(priority.toUpperCase())) {
        params.push(priority.toUpperCase());
        conditions.push(`n.priority = $${params.length}`);
    }

    const whereClause = conditions.join(" AND ");

    // Count total
    const countRes = await pool.query(
        `SELECT COUNT(*)::int AS count FROM notifications n WHERE ${whereClause}`,
        params
    );
    const total = countRes.rows[0]?.count || 0;

    // Count total unread
    const unreadRes = await pool.query(
        "SELECT COUNT(*)::int AS count FROM notifications WHERE recipient_user_id = $1 AND is_read = FALSE",
        [userId]
    );
    const unreadCount = unreadRes.rows[0]?.count || 0;

    // Fetch paginated records
    params.push(limitNum, offset);
    const listRes = await pool.query(
        `SELECT n.*,
                u.name AS actor_name, u.role AS actor_role
         FROM notifications n
         LEFT JOIN users u ON u.id = n.actor_user_id
         WHERE ${whereClause}
         ORDER BY n.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
    );

    return {
        total,
        page: pageNum,
        limit: limitNum,
        unread_count: unreadCount,
        notifications: listRes.rows.map(formatNotification),
    };
}

async function getUnreadCount(userId) {
    const res = await pool.query(
        "SELECT COUNT(*)::int AS count FROM notifications WHERE recipient_user_id = $1 AND is_read = FALSE",
        [userId]
    );
    return { unread_count: res.rows[0]?.count || 0 };
}

async function getNotificationById(id, userId) {
    const res = await pool.query(
        `SELECT n.*,
                u.name AS actor_name, u.role AS actor_role
         FROM notifications n
         LEFT JOIN users u ON u.id = n.actor_user_id
         WHERE n.id = $1 AND n.recipient_user_id = $2`,
        [id, userId]
    );

    if (res.rows.length === 0) {
        throw new NotFoundError("Notification not found");
    }

    return formatNotification(res.rows[0]);
}

async function markNotificationRead(id, userId) {
    const res = await pool.query(
        `UPDATE notifications
         SET is_read = TRUE,
             read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
         WHERE id = $1 AND recipient_user_id = $2
         RETURNING *`,
        [id, userId]
    );

    if (res.rows.length === 0) {
        throw new NotFoundError("Notification not found");
    }

    return formatNotification(res.rows[0]);
}

async function markAllNotificationsRead(userId) {
    const res = await pool.query(
        `UPDATE notifications
         SET is_read = TRUE,
             read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
         WHERE recipient_user_id = $1 AND is_read = FALSE
         RETURNING id`,
        [userId]
    );

    return {
        message: "All notifications marked as read",
        marked_count: res.rows.length,
    };
}

async function deleteNotification(id, userId) {
    const res = await pool.query(
        "DELETE FROM notifications WHERE id = $1 AND recipient_user_id = $2 RETURNING id",
        [id, userId]
    );

    if (res.rows.length === 0) {
        throw new NotFoundError("Notification not found");
    }

    return {
        message: "Notification deleted successfully",
        id: Number(id),
    };
}

// ---------------------------------------------------------------------------
// 4. Formatter Helper
// ---------------------------------------------------------------------------

function formatNotification(row) {
    if (!row) return null;

    const actor = row.actor_name
        ? { id: row.actor_user_id, name: row.actor_name, role: row.actor_role }
        : row.actor_user_id
        ? { id: row.actor_user_id }
        : null;

    return {
        id: row.id,
        recipient_user_id: row.recipient_user_id,
        actor,
        event_type: row.event_type,
        title: row.title,
        message: row.message,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        priority: row.priority,
        action_url: row.action_url,
        metadata: row.metadata,
        is_read: Boolean(row.is_read),
        read_at: row.read_at,
        created_at: row.created_at,
    };
}

module.exports = {
    ValidationError,
    ForbiddenError,
    NotFoundError,
    isValidActionUrl,
    generateDedupKey,
    resolveRecipients,
    notify,
    getUserNotifications,
    getUnreadCount,
    getNotificationById,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    formatNotification,
};
