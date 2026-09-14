/**
 * collaborationService.js
 *
 * MODULE 9 — COLLABORATION TEAMS
 *
 * Business logic for collaboration team lifecycle:
 *   - Team creation
 *   - Member invitations
 *   - Accept / decline
 *   - Member removal
 *   - Team status transitions
 *
 * Reuses:
 *   - notificationService.notify()  for all team events
 *   - pool (pg-pool) consistent with all other services
 */

"use strict";

const pool = require("../config/db");
const { notify } = require("./notificationService");

// ---------------------------------------------------------------------------
// Custom Errors (consistent with other services)
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
// Constants
// ---------------------------------------------------------------------------

const VALID_STATUSES = ["FORMING", "ACTIVE", "COMPLETED", "CLOSED"];

const VALID_TRANSITIONS = {
    FORMING:   ["ACTIVE", "CLOSED"],
    ACTIVE:    ["COMPLETED", "CLOSED"],
    COMPLETED: [],
    CLOSED:    [],
};

const VALID_MEMBER_ROLES = ["LEAD", "FACULTY", "STUDENT", "RESEARCHER", "STARTUP", "MSME", "CITIZEN"];

// Map user system roles to default team member roles
function defaultRoleForUser(userRole) {
    const map = {
        FACULTY: "FACULTY",
        STUDENT: "STUDENT",
        RESEARCHER: "RESEARCHER",
        STARTUP: "STARTUP",
        MSME: "MSME",
        UNIVERSITY: "FACULTY",
        CITIZEN: "CITIZEN",
        AUTHORITY: "CITIZEN",
        ADMIN: "CITIZEN",
    };
    return map[userRole] || "CITIZEN";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a team row for API response — no sensitive data.
 */
function formatTeam(row) {
    if (!row) return null;
    return {
        id: row.id,
        problem_id: row.problem_id,
        problem_title: row.problem_title || null,
        name: row.name,
        created_by: row.created_by,
        creator_name: row.creator_name || null,
        status: row.status,
        member_count: row.member_count !== undefined ? Number(row.member_count) : null,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

/**
 * Format a team member row for API response.
 */
function formatMember(row) {
    if (!row) return null;
    return {
        id: row.id,
        team_id: row.team_id,
        user_id: row.user_id,
        user_name: row.user_name || null,
        user_role: row.user_role || null,
        role: row.role,
        membership_status: row.membership_status,
        joined_at: row.joined_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

/**
 * Check if a user is the LEAD of a team.
 */
async function isTeamLead(teamId, userId) {
    const res = await pool.query(
        `SELECT id FROM collaboration_team_members
         WHERE team_id = $1 AND user_id = $2 AND role = 'LEAD' AND membership_status = 'ACTIVE'`,
        [teamId, userId]
    );
    return res.rows.length > 0;
}

// ---------------------------------------------------------------------------
// 1. Create Team
// ---------------------------------------------------------------------------

/**
 * Create a collaboration team for a problem.
 * Creator is automatically added as LEAD + ACTIVE.
 */
async function createTeam(creatorId, { problemId, name }) {
    // Validate name
    if (!name || typeof name !== "string" || name.trim().length === 0) {
        throw new ValidationError("Team name is required");
    }
    if (name.trim().length > 200) {
        throw new ValidationError("Team name must not exceed 200 characters");
    }

    // Validate problemId
    const pid = parseInt(problemId, 10);
    if (isNaN(pid)) {
        throw new ValidationError("Invalid problem ID");
    }

    // Verify problem exists
    const probCheck = await pool.query("SELECT id, title FROM problems WHERE id = $1", [pid]);
    if (probCheck.rows.length === 0) {
        throw new NotFoundError("Problem not found");
    }

    // Get creator info
    const userRes = await pool.query("SELECT id, name, role FROM users WHERE id = $1", [creatorId]);
    if (userRes.rows.length === 0) {
        throw new NotFoundError("User not found");
    }

    // Create team
    const teamRes = await pool.query(
        `INSERT INTO collaboration_teams (problem_id, name, created_by, status)
         VALUES ($1, $2, $3, 'FORMING')
         RETURNING *`,
        [pid, name.trim(), creatorId]
    );
    const team = teamRes.rows[0];

    // Add creator as LEAD + ACTIVE
    await pool.query(
        `INSERT INTO collaboration_team_members (team_id, user_id, role, membership_status, joined_at)
         VALUES ($1, $2, 'LEAD', 'ACTIVE', CURRENT_TIMESTAMP)`,
        [team.id, creatorId]
    );

    return {
        ...formatTeam({
            ...team,
            problem_title: probCheck.rows[0].title,
            creator_name: userRes.rows[0].name,
            member_count: 1,
        }),
        members: [{
            user_id: creatorId,
            user_name: userRes.rows[0].name,
            user_role: userRes.rows[0].role,
            role: "LEAD",
            membership_status: "ACTIVE",
            joined_at: new Date().toISOString(),
        }],
    };
}

// ---------------------------------------------------------------------------
// 2. Get Team
// ---------------------------------------------------------------------------

/**
 * Get full team details including members.
 */
async function getTeamById(teamId) {
    const tid = parseInt(teamId, 10);
    if (isNaN(tid)) throw new ValidationError("Invalid team ID");

    const teamRes = await pool.query(
        `SELECT ct.*,
                p.title AS problem_title,
                u.name  AS creator_name,
                COUNT(ctm.id) FILTER (WHERE ctm.membership_status = 'ACTIVE') AS member_count
         FROM collaboration_teams ct
         JOIN problems p ON p.id = ct.problem_id
         JOIN users u ON u.id = ct.created_by
         LEFT JOIN collaboration_team_members ctm ON ctm.team_id = ct.id
         WHERE ct.id = $1
         GROUP BY ct.id, p.title, u.name`,
        [tid]
    );

    if (teamRes.rows.length === 0) throw new NotFoundError("Team not found");

    const membersRes = await pool.query(
        `SELECT ctm.*,
                u.name AS user_name,
                u.role AS user_role
         FROM collaboration_team_members ctm
         JOIN users u ON u.id = ctm.user_id
         WHERE ctm.team_id = $1
         ORDER BY ctm.created_at ASC`,
        [tid]
    );

    return {
        ...formatTeam(teamRes.rows[0]),
        members: membersRes.rows.map(formatMember),
    };
}

// ---------------------------------------------------------------------------
// 3. List Teams for a Problem
// ---------------------------------------------------------------------------

async function getTeamsForProblem(problemId) {
    const pid = parseInt(problemId, 10);
    if (isNaN(pid)) throw new ValidationError("Invalid problem ID");

    const probCheck = await pool.query("SELECT id FROM problems WHERE id = $1", [pid]);
    if (probCheck.rows.length === 0) throw new NotFoundError("Problem not found");

    const res = await pool.query(
        `SELECT ct.*,
                p.title AS problem_title,
                u.name  AS creator_name,
                COUNT(ctm.id) FILTER (WHERE ctm.membership_status = 'ACTIVE') AS member_count
         FROM collaboration_teams ct
         JOIN problems p ON p.id = ct.problem_id
         JOIN users u ON u.id = ct.created_by
         LEFT JOIN collaboration_team_members ctm ON ctm.team_id = ct.id
         WHERE ct.problem_id = $1
         GROUP BY ct.id, p.title, u.name
         ORDER BY ct.created_at DESC`,
        [pid]
    );

    return res.rows.map(formatTeam);
}

// ---------------------------------------------------------------------------
// 4. Invite Member
// ---------------------------------------------------------------------------

/**
 * Invite a user to a team. Only LEAD can invite.
 */
async function inviteMember(teamId, inviterId, { userId, role }) {
    const tid = parseInt(teamId, 10);
    if (isNaN(tid)) throw new ValidationError("Invalid team ID");

    const uid = parseInt(userId, 10);
    if (isNaN(uid)) throw new ValidationError("Invalid user ID");

    // Validate role
    const memberRole = role && VALID_MEMBER_ROLES.includes(role.toUpperCase())
        ? role.toUpperCase()
        : null;
    if (!memberRole) {
        throw new ValidationError(`Invalid role. Must be one of: ${VALID_MEMBER_ROLES.join(", ")}`);
    }
    if (memberRole === "LEAD") {
        throw new ValidationError("Cannot directly invite as LEAD. Use the status change flow.");
    }

    // Verify team exists
    const teamRes = await pool.query("SELECT * FROM collaboration_teams WHERE id = $1", [tid]);
    if (teamRes.rows.length === 0) throw new NotFoundError("Team not found");

    const team = teamRes.rows[0];
    if (team.status === "CLOSED" || team.status === "COMPLETED") {
        throw new ValidationError("Cannot invite members to a closed or completed team");
    }

    // Only LEAD can invite
    const lead = await isTeamLead(tid, inviterId);
    if (!lead) throw new ForbiddenError("Only the team LEAD can invite members");

    // Verify invited user exists
    const invitedUserRes = await pool.query("SELECT id, name, role FROM users WHERE id = $1", [uid]);
    if (invitedUserRes.rows.length === 0) throw new NotFoundError("Invited user not found");

    // Prevent self-invitation
    if (uid === inviterId) {
        throw new ValidationError("You cannot invite yourself");
    }

    // Check for existing membership
    const existingRes = await pool.query(
        "SELECT id, membership_status FROM collaboration_team_members WHERE team_id = $1 AND user_id = $2",
        [tid, uid]
    );

    if (existingRes.rows.length > 0) {
        const existing = existingRes.rows[0];
        if (existing.membership_status === "ACTIVE" || existing.membership_status === "INVITED") {
            throw new ValidationError("User is already a member or has a pending invitation");
        }
        // Re-invite if previously DECLINED or REMOVED
        const updatedRes = await pool.query(
            `UPDATE collaboration_team_members
             SET role = $1, membership_status = 'INVITED', joined_at = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE team_id = $2 AND user_id = $3
             RETURNING *`,
            [memberRole, tid, uid]
        );
        const member = updatedRes.rows[0];

        // Notify invited user
        await _notifyTeamInvitation(tid, inviterId, uid, team.name);

        return formatMember({ ...member, user_name: invitedUserRes.rows[0].name, user_role: invitedUserRes.rows[0].role });
    }

    // Insert new invitation
    const memberRes = await pool.query(
        `INSERT INTO collaboration_team_members (team_id, user_id, role, membership_status)
         VALUES ($1, $2, $3, 'INVITED')
         RETURNING *`,
        [tid, uid, memberRole]
    );

    // Notify invited user
    await _notifyTeamInvitation(tid, inviterId, uid, team.name);

    return formatMember({
        ...memberRes.rows[0],
        user_name: invitedUserRes.rows[0].name,
        user_role: invitedUserRes.rows[0].role,
    });
}

// ---------------------------------------------------------------------------
// 5. Accept Invitation
// ---------------------------------------------------------------------------

async function acceptInvitation(teamId, userId) {
    const tid = parseInt(teamId, 10);
    if (isNaN(tid)) throw new ValidationError("Invalid team ID");

    // Verify team
    const teamRes = await pool.query("SELECT * FROM collaboration_teams WHERE id = $1", [tid]);
    if (teamRes.rows.length === 0) throw new NotFoundError("Team not found");

    // Find invitation
    const memberRes = await pool.query(
        "SELECT * FROM collaboration_team_members WHERE team_id = $1 AND user_id = $2",
        [tid, userId]
    );

    if (memberRes.rows.length === 0) {
        throw new NotFoundError("You do not have an invitation for this team");
    }

    const member = memberRes.rows[0];

    if (member.membership_status !== "INVITED") {
        throw new ValidationError(`Cannot accept — current status is ${member.membership_status}`);
    }

    const updated = await pool.query(
        `UPDATE collaboration_team_members
         SET membership_status = 'ACTIVE', joined_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE team_id = $1 AND user_id = $2
         RETURNING *`,
        [tid, userId]
    );

    // Notify team LEAD
    await _notifyInvitationResponse(tid, userId, teamRes.rows[0].name, "accepted", teamRes.rows[0].created_by);

    const userRes = await pool.query("SELECT name, role FROM users WHERE id = $1", [userId]);
    return formatMember({ ...updated.rows[0], user_name: userRes.rows[0].name, user_role: userRes.rows[0].role });
}

// ---------------------------------------------------------------------------
// 6. Decline Invitation
// ---------------------------------------------------------------------------

async function declineInvitation(teamId, userId) {
    const tid = parseInt(teamId, 10);
    if (isNaN(tid)) throw new ValidationError("Invalid team ID");

    const teamRes = await pool.query("SELECT * FROM collaboration_teams WHERE id = $1", [tid]);
    if (teamRes.rows.length === 0) throw new NotFoundError("Team not found");

    const memberRes = await pool.query(
        "SELECT * FROM collaboration_team_members WHERE team_id = $1 AND user_id = $2",
        [tid, userId]
    );

    if (memberRes.rows.length === 0) {
        throw new NotFoundError("You do not have an invitation for this team");
    }

    const member = memberRes.rows[0];

    if (member.membership_status !== "INVITED") {
        throw new ValidationError(`Cannot decline — current status is ${member.membership_status}`);
    }

    const updated = await pool.query(
        `UPDATE collaboration_team_members
         SET membership_status = 'DECLINED', updated_at = CURRENT_TIMESTAMP
         WHERE team_id = $1 AND user_id = $2
         RETURNING *`,
        [tid, userId]
    );

    // Notify team LEAD
    await _notifyInvitationResponse(tid, userId, teamRes.rows[0].name, "declined", teamRes.rows[0].created_by);

    const userRes = await pool.query("SELECT name, role FROM users WHERE id = $1", [userId]);
    return formatMember({ ...updated.rows[0], user_name: userRes.rows[0].name, user_role: userRes.rows[0].role });
}

// ---------------------------------------------------------------------------
// 7. Remove Member
// ---------------------------------------------------------------------------

async function removeMember(teamId, requesterId, targetUserId) {
    const tid = parseInt(teamId, 10);
    if (isNaN(tid)) throw new ValidationError("Invalid team ID");

    const tuid = parseInt(targetUserId, 10);
    if (isNaN(tuid)) throw new ValidationError("Invalid user ID");

    const teamRes = await pool.query("SELECT * FROM collaboration_teams WHERE id = $1", [tid]);
    if (teamRes.rows.length === 0) throw new NotFoundError("Team not found");

    // Requester must be LEAD
    const lead = await isTeamLead(tid, requesterId);
    if (!lead) throw new ForbiddenError("Only the team LEAD can remove members");

    // Cannot remove yourself (the last LEAD) through this endpoint
    if (tuid === requesterId) {
        throw new ValidationError("Team LEAD cannot remove themselves. Use team status change to close the team.");
    }

    const memberRes = await pool.query(
        "SELECT * FROM collaboration_team_members WHERE team_id = $1 AND user_id = $2",
        [tid, tuid]
    );

    if (memberRes.rows.length === 0) throw new NotFoundError("Member not found in this team");

    const member = memberRes.rows[0];
    if (member.membership_status === "REMOVED") {
        throw new ValidationError("Member is already removed");
    }

    await pool.query(
        `UPDATE collaboration_team_members
         SET membership_status = 'REMOVED', updated_at = CURRENT_TIMESTAMP
         WHERE team_id = $1 AND user_id = $2`,
        [tid, tuid]
    );

    // Notify removed member
    await notify({
        eventType: "MEMBER_REMOVED",
        entityType: "TEAM",
        entityId: tid,
        actorUserId: requesterId,
        title: "Removed from Collaboration Team",
        message: `You have been removed from the team: ${teamRes.rows[0].name}`,
        priority: "NORMAL",
        actionUrl: `/teams/${tid}`,
        recipientUserIds: [tuid],
    });

    return { message: "Member removed successfully", user_id: tuid };
}

// ---------------------------------------------------------------------------
// 8. Update Team Status
// ---------------------------------------------------------------------------

async function updateTeamStatus(teamId, requesterId, newStatus) {
    const tid = parseInt(teamId, 10);
    if (isNaN(tid)) throw new ValidationError("Invalid team ID");

    if (!newStatus || !VALID_STATUSES.includes(newStatus.toUpperCase())) {
        throw new ValidationError(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
    }
    const status = newStatus.toUpperCase();

    const teamRes = await pool.query("SELECT * FROM collaboration_teams WHERE id = $1", [tid]);
    if (teamRes.rows.length === 0) throw new NotFoundError("Team not found");

    const team = teamRes.rows[0];
    const currentStatus = team.status;

    // Validate transition
    const allowedNext = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(status)) {
        throw new ValidationError(
            `Cannot transition from ${currentStatus} to ${status}. ` +
            `Allowed: ${allowedNext.join(", ") || "none"}`
        );
    }

    // Only LEAD can change status (AUTHORITY/ADMIN checked at controller level)
    const lead = await isTeamLead(tid, requesterId);
    if (!lead) throw new ForbiddenError("Only the team LEAD can change team status");

    const updated = await pool.query(
        `UPDATE collaboration_teams
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [status, tid]
    );

    // Notify all ACTIVE members
    const activeMembersRes = await pool.query(
        `SELECT user_id FROM collaboration_team_members
         WHERE team_id = $1 AND membership_status = 'ACTIVE'`,
        [tid]
    );
    const recipientIds = activeMembersRes.rows.map((r) => r.user_id);

    await notify({
        eventType: "TEAM_STATUS_CHANGED",
        entityType: "TEAM",
        entityId: tid,
        actorUserId: requesterId,
        title: "Team Status Updated",
        message: `The team "${team.name}" status changed to ${status}`,
        priority: "NORMAL",
        actionUrl: `/teams/${tid}`,
        recipientUserIds: recipientIds,
    });

    const userRes = await pool.query("SELECT name FROM users WHERE id = $1", [team.created_by]);
    return formatTeam({
        ...updated.rows[0],
        creator_name: userRes.rows[0]?.name || null,
    });
}

// ---------------------------------------------------------------------------
// Private Notification Helpers
// ---------------------------------------------------------------------------

async function _notifyTeamInvitation(teamId, actorId, invitedUserId, teamName) {
    return notify({
        eventType: "TEAM_INVITATION",
        entityType: "TEAM",
        entityId: teamId,
        actorUserId: actorId,
        title: "Collaboration Team Invitation",
        message: `You have been invited to join the team: ${teamName}`,
        priority: "HIGH",
        actionUrl: `/teams/${teamId}`,
        recipientUserIds: [invitedUserId],
    });
}

async function _notifyInvitationResponse(teamId, actorId, teamName, response, leadId) {
    return notify({
        eventType: response === "accepted" ? "INVITATION_ACCEPTED" : "INVITATION_DECLINED",
        entityType: "TEAM",
        entityId: teamId,
        actorUserId: actorId,
        title: `Invitation ${response === "accepted" ? "Accepted" : "Declined"}`,
        message: `A member has ${response} the invitation to team: ${teamName}`,
        priority: "NORMAL",
        actionUrl: `/teams/${teamId}`,
        recipientUserIds: [leadId],
    });
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
    ValidationError,
    ForbiddenError,
    NotFoundError,
    VALID_STATUSES,
    VALID_TRANSITIONS,
    VALID_MEMBER_ROLES,
    defaultRoleForUser,
    isTeamLead,
    createTeam,
    getTeamById,
    getTeamsForProblem,
    inviteMember,
    acceptInvitation,
    declineInvitation,
    removeMember,
    updateTeamStatus,
};
