/**
 * notificationController.js
 *
 * MODULE 13 — SMART NOTIFICATION CONTROLLER
 */

"use strict";

const {
    ValidationError,
    ForbiddenError,
    NotFoundError,
    getUserNotifications,
    getUnreadCount,
    getNotificationById,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
} = require("../services/notificationService");

function handleError(error, res, fallbackMessage) {
    if (error instanceof ValidationError || error.name === "ValidationError") {
        return res.status(400).json({ message: error.message });
    }
    if (error instanceof ForbiddenError || error.name === "ForbiddenError") {
        return res.status(403).json({ message: error.message });
    }
    if (error instanceof NotFoundError || error.name === "NotFoundError") {
        return res.status(404).json({ message: error.message });
    }

    console.error(fallbackMessage, error);
    res.status(500).json({ message: fallbackMessage });
}

// GET /api/notifications
async function getUserNotificationsHandler(req, res) {
    try {
        const { is_read, priority, page, limit } = req.query;
        const data = await getUserNotifications(req.user.id, {
            isRead: is_read,
            priority,
            page,
            limit,
        });
        res.status(200).json(data);
    } catch (err) {
        handleError(err, res, "Failed to retrieve notifications");
    }
}

// GET /api/notifications/unread-count
async function getUnreadCountHandler(req, res) {
    try {
        const data = await getUnreadCount(req.user.id);
        res.status(200).json(data);
    } catch (err) {
        handleError(err, res, "Failed to retrieve unread notification count");
    }
}

// GET /api/notifications/:id
async function getNotificationByIdHandler(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid notification id" });
    }

    try {
        const notification = await getNotificationById(id, req.user.id);
        res.status(200).json({ notification });
    } catch (err) {
        handleError(err, res, "Failed to retrieve notification");
    }
}

// PATCH /api/notifications/:id/read
async function markNotificationReadHandler(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid notification id" });
    }

    try {
        const notification = await markNotificationRead(id, req.user.id);
        res.status(200).json({
            message: "Notification marked as read",
            notification,
        });
    } catch (err) {
        handleError(err, res, "Failed to mark notification as read");
    }
}

// PATCH /api/notifications/read-all
async function markAllNotificationsReadHandler(req, res) {
    try {
        const result = await markAllNotificationsRead(req.user.id);
        res.status(200).json(result);
    } catch (err) {
        handleError(err, res, "Failed to mark all notifications as read");
    }
}

// DELETE /api/notifications/:id
async function deleteNotificationHandler(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid notification id" });
    }

    try {
        const result = await deleteNotification(id, req.user.id);
        res.status(200).json(result);
    } catch (err) {
        handleError(err, res, "Failed to delete notification");
    }
}

module.exports = {
    getUserNotificationsHandler,
    getUnreadCountHandler,
    getNotificationByIdHandler,
    markNotificationReadHandler,
    markAllNotificationsReadHandler,
    deleteNotificationHandler,
};
