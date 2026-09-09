/**
 * notificationRoutes.js
 *
 * MODULE 13 — SMART NOTIFICATION ROUTER
 */

"use strict";

const express = require("express");
const { authenticate } = require("../middleware/authMiddleware");
const {
    getUserNotificationsHandler,
    getUnreadCountHandler,
    getNotificationByIdHandler,
    markNotificationReadHandler,
    markAllNotificationsReadHandler,
    deleteNotificationHandler,
} = require("../controllers/notificationController");

const router = express.Router();

// GET /api/notifications
router.get(
    "/",
    authenticate,
    getUserNotificationsHandler
);

// GET /api/notifications/unread-count
// (Mounted before :id)
router.get(
    "/unread-count",
    authenticate,
    getUnreadCountHandler
);

// PATCH /api/notifications/read-all
// (Mounted before :id)
router.patch(
    "/read-all",
    authenticate,
    markAllNotificationsReadHandler
);

// GET /api/notifications/:id
router.get(
    "/:id",
    authenticate,
    getNotificationByIdHandler
);

// PATCH /api/notifications/:id/read
router.patch(
    "/:id/read",
    authenticate,
    markNotificationReadHandler
);

// DELETE /api/notifications/:id
router.delete(
    "/:id",
    authenticate,
    deleteNotificationHandler
);

module.exports = router;
