"use strict";

/**
 * m9_collaboration.test.js
 *
 * Integration tests for Module 9 — Collaboration Teams.
 * Runs against the live database (same as the running backend).
 *
 * Tests:
 *   TEAM CREATION (T1–T6)
 *   TEAM ACCESS    (T7–T9)
 *   INVITATIONS    (T10–T14)
 *   ACCEPT/DECLINE (T15–T19)
 *   MEMBERSHIP     (T20–T23)
 *   STATUS         (T24–T26)
 *   M10 INTEGRATION (T27–T28)
 *   REGRESSION     (T29–T30)
 */

const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/db");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "change_this_to_a_long_random_secret";
const testSuffix = Date.now();

let citizenToken, citizen2Token, studentToken, authorityToken;
let citizenId, citizen2Id, studentId;
let problemId;
let teamId;

// ---------------------------------------------------------------------------
// beforeAll — create test users and problem
// ---------------------------------------------------------------------------

beforeAll(async () => {
    // Citizen 1 (will be team LEAD)
    const r1 = await request(app).post("/api/auth/register").send({
        name: `Citizen_m9_${testSuffix}`,
        email: `citizen_m9_${testSuffix}@test.com`,
        password: "Test1234!",
        role: "CITIZEN",
    });
    citizenToken = r1.body.token;
    citizenId = jwt.decode(citizenToken).id;

    // Citizen 2 (will be invited)
    const r2 = await request(app).post("/api/auth/register").send({
        name: `Citizen2_m9_${testSuffix}`,
        email: `citizen2_m9_${testSuffix}@test.com`,
        password: "Test1234!",
        role: "CITIZEN",
    });
    citizen2Token = r2.body.token;
    citizen2Id = jwt.decode(citizen2Token).id;

    // Student (will be invited as STUDENT role)
    const r3 = await request(app).post("/api/auth/register").send({
        name: `Student_m9_${testSuffix}`,
        email: `student_m9_${testSuffix}@test.com`,
        password: "Test1234!",
        role: "STUDENT",
    });
    studentToken = r3.body.token;
    studentId = jwt.decode(studentToken).id;

    // Authority
    const r4 = await request(app).post("/api/auth/register").send({
        name: `Authority_m9_${testSuffix}`,
        email: `authority_m9_${testSuffix}@test.com`,
        password: "Test1234!",
        role: "AUTHORITY",
    });
    authorityToken = r4.body.token;

    // Problem (direct DB insert — avoids AI service dependency)
    const probRes = await pool.query(
        `INSERT INTO problems (reporter_id, title, description, category, district, severity, urgency, priority_score)
         VALUES ($1, 'M9 Test Problem', 'Groundwater contamination test problem for M9', 'Environment', 'Test District', 5, 5, 50)
         RETURNING id`,
        [citizenId]
    );
    problemId = probRes.rows[0].id;
});

// ---------------------------------------------------------------------------
// afterAll — cleanup
// ---------------------------------------------------------------------------

afterAll(async () => {
    // Remove solutions linked to test team
    await pool.query(
        "DELETE FROM solutions WHERE submitted_by IN (SELECT id FROM users WHERE email LIKE $1)",
        [`%_m9_${testSuffix}@test.com`]
    );
    // Remove team members and teams
    if (teamId) {
        await pool.query("DELETE FROM collaboration_team_members WHERE team_id = $1", [teamId]);
        await pool.query("DELETE FROM collaboration_teams WHERE id = $1", [teamId]);
    }
    // Also clean up any other teams for the test problem
    await pool.query("DELETE FROM collaboration_teams WHERE problem_id = $1", [problemId]);
    await pool.query("DELETE FROM problems WHERE id = $1", [problemId]);
    await pool.query("DELETE FROM users WHERE email LIKE $1", [`%_m9_${testSuffix}@test.com`]);
});

// ===========================================================================
// TEAM CREATION (T1–T6)
// ===========================================================================

describe("M9 — Team Creation", () => {
    // T1 — Authenticated user can create a team
    test("T1 — Authenticated user can create a team", async () => {
        const res = await request(app)
            .post("/api/teams")
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ problemId, name: `Groundwater Solution Team ${testSuffix}` });

        expect(res.status).toBe(201);
        expect(res.body.team).toBeDefined();
        expect(res.body.team.name).toContain("Groundwater Solution Team");
        expect(res.body.team.problem_id).toBe(problemId);
        expect(res.body.team.status).toBe("FORMING");
        teamId = res.body.team.id;
        expect(teamId).toBeDefined();
    });

    // T2 — Team requires a valid problem
    test("T2 — Team requires a valid problem", async () => {
        const res = await request(app)
            .post("/api/teams")
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ problemId: 999999, name: "Invalid Team" });

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/problem not found/i);
    });

    // T3 — Team requires a non-empty name
    test("T3 — Team name is required", async () => {
        const res = await request(app)
            .post("/api/teams")
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ problemId, name: "" });

        expect(res.status).toBe(400);
    });

    // T4 — Creator automatically becomes LEAD
    test("T4 — Creator automatically becomes LEAD", async () => {
        const res = await request(app)
            .get(`/api/teams/${teamId}`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        const lead = res.body.team.members.find(
            (m) => m.user_id === citizenId && m.role === "LEAD"
        );
        expect(lead).toBeDefined();
    });

    // T5 — Creator is automatically ACTIVE member
    test("T5 — Creator automatically becomes ACTIVE member", async () => {
        const res = await request(app)
            .get(`/api/teams/${teamId}`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        const lead = res.body.team.members.find((m) => m.user_id === citizenId);
        expect(lead).toBeDefined();
        expect(lead.membership_status).toBe("ACTIVE");
    });

    // T6 — Unauthenticated creation is rejected
    test("T6 — Unauthenticated creation rejected (401)", async () => {
        const res = await request(app)
            .post("/api/teams")
            .send({ problemId, name: "Anon Team" });

        expect(res.status).toBe(401);
    });
});

// ===========================================================================
// TEAM ACCESS (T7–T9)
// ===========================================================================

describe("M9 — Team Access", () => {
    // T7 — Team can be retrieved by ID
    test("T7 — Team can be retrieved by ID", async () => {
        const res = await request(app)
            .get(`/api/teams/${teamId}`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        expect(res.body.team.id).toBe(teamId);
        expect(res.body.team.problem_title).toBeDefined();
        expect(Array.isArray(res.body.team.members)).toBe(true);
        // No sensitive fields
        expect(res.body.team.members[0].password_hash).toBeUndefined();
    });

    // T8 — Teams can be listed for a problem
    test("T8 — Teams can be listed for a problem", async () => {
        const res = await request(app)
            .get(`/api/problems/${problemId}/teams`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        expect(res.body.problem_id).toBe(problemId);
        expect(Array.isArray(res.body.teams)).toBe(true);
        expect(res.body.teams.length).toBeGreaterThanOrEqual(1);
        const team = res.body.teams.find((t) => t.id === teamId);
        expect(team).toBeDefined();
        expect(team.member_count).toBeGreaterThanOrEqual(1);
    });

    // T9 — Invalid team ID returns 400, nonexistent returns 404
    test("T9 — Invalid team ID returns 400", async () => {
        const res = await request(app)
            .get("/api/teams/abc")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(400);
    });

    test("T9b — Nonexistent team returns 404", async () => {
        const res = await request(app)
            .get("/api/teams/999999")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(404);
    });
});

// ===========================================================================
// INVITATIONS (T10–T14)
// ===========================================================================

describe("M9 — Invitations", () => {
    // T10 — LEAD can invite a member
    test("T10 — Team LEAD can invite a member", async () => {
        const res = await request(app)
            .post(`/api/teams/${teamId}/invite`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ userId: citizen2Id, role: "CITIZEN" });

        expect(res.status).toBe(201);
        expect(res.body.member.user_id).toBe(citizen2Id);
        expect(res.body.member.membership_status).toBe("INVITED");
        expect(res.body.member.role).toBe("CITIZEN");
    });

    // T11 — Duplicate invitation prevented
    test("T11 — Duplicate invitation prevented", async () => {
        const res = await request(app)
            .post(`/api/teams/${teamId}/invite`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ userId: citizen2Id, role: "CITIZEN" });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/already a member|pending invitation/i);
    });

    // T12 — Invalid user rejected
    test("T12 — Invalid user ID rejected", async () => {
        const res = await request(app)
            .post(`/api/teams/${teamId}/invite`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ userId: 999999, role: "STUDENT" });

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/user not found/i);
    });

    // T13 — Non-LEAD user cannot invite
    test("T13 — Non-LEAD cannot invite members (403)", async () => {
        const res = await request(app)
            .post(`/api/teams/${teamId}/invite`)
            .set("Authorization", `Bearer ${citizen2Token}`)
            .send({ userId: studentId, role: "STUDENT" });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/only the team lead/i);
    });

    // T14 — Notification generated for invited user
    test("T14 — Notification generated for invited user", async () => {
        const res = await request(app)
            .get("/api/notifications")
            .set("Authorization", `Bearer ${citizen2Token}`);

        expect(res.status).toBe(200);
        const teamNotif = res.body.notifications.find(
            (n) => n.event_type === "TEAM_INVITATION"
        );
        expect(teamNotif).toBeDefined();
    });
});

// ===========================================================================
// ACCEPT / DECLINE (T15–T19)
// ===========================================================================

describe("M9 — Accept / Decline", () => {
    // T15 — Invited user can accept
    test("T15 — Invited user can accept invitation", async () => {
        const res = await request(app)
            .post(`/api/teams/${teamId}/accept`)
            .set("Authorization", `Bearer ${citizen2Token}`);

        expect(res.status).toBe(200);
        expect(res.body.member.membership_status).toBe("ACTIVE");
    });

    // T16 — Accepted membership is ACTIVE
    test("T16 — Membership status is ACTIVE after acceptance", async () => {
        const res = await request(app)
            .get(`/api/teams/${teamId}`)
            .set("Authorization", `Bearer ${citizenToken}`);

        const member = res.body.team.members.find((m) => m.user_id === citizen2Id);
        expect(member).toBeDefined();
        expect(member.membership_status).toBe("ACTIVE");
    });

    // T17 — Invite student, then decline
    test("T17 — Invited user can decline invitation", async () => {
        // First invite the student
        const inviteRes = await request(app)
            .post(`/api/teams/${teamId}/invite`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ userId: studentId, role: "STUDENT" });
        expect(inviteRes.status).toBe(201);

        const declineRes = await request(app)
            .post(`/api/teams/${teamId}/decline`)
            .set("Authorization", `Bearer ${studentToken}`);

        expect(declineRes.status).toBe(200);
        expect(declineRes.body.member.membership_status).toBe("DECLINED");
    });

    // T18 — Declined membership is DECLINED
    test("T18 — Declined membership status is DECLINED", async () => {
        const res = await request(app)
            .get(`/api/teams/${teamId}`)
            .set("Authorization", `Bearer ${citizenToken}`);

        const member = res.body.team.members.find((m) => m.user_id === studentId);
        expect(member).toBeDefined();
        expect(member.membership_status).toBe("DECLINED");
    });

    // T19 — User cannot accept someone else's invitation
    test("T19 — User cannot accept another user's invitation", async () => {
        // Re-invite student
        await request(app)
            .post(`/api/teams/${teamId}/invite`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ userId: studentId, role: "STUDENT" });

        // Citizen2 tries to accept student's invitation — should fail (no invitation for citizen2)
        const res = await request(app)
            .post(`/api/teams/${teamId}/accept`)
            .set("Authorization", `Bearer ${citizen2Token}`);

        // citizen2 is already ACTIVE (not INVITED), so cannot accept again
        expect([400, 404]).toContain(res.status);
    });
});

// ===========================================================================
// MEMBERSHIP (T20–T23)
// ===========================================================================

describe("M9 — Membership", () => {
    // T20 — Duplicate membership prevented at DB level
    test("T20 — Duplicate membership prevented", async () => {
        // Citizen2 is already ACTIVE — trying to invite again should fail
        const res = await request(app)
            .post(`/api/teams/${teamId}/invite`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ userId: citizen2Id, role: "CITIZEN" });

        expect(res.status).toBe(400);
    });

    // T21 — LEAD can remove a member
    test("T21 — Authorized LEAD can remove a member", async () => {
        const res = await request(app)
            .delete(`/api/teams/${teamId}/members/${citizen2Id}`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        expect(res.body.user_id).toBe(citizen2Id);
    });

    // T22 — Unauthorized user cannot remove a member
    test("T22 — Unauthorized user cannot remove a member (403)", async () => {
        const res = await request(app)
            .delete(`/api/teams/${teamId}/members/${studentId}`)
            .set("Authorization", `Bearer ${citizen2Token}`);

        expect(res.status).toBe(403);
    });

    // T23 — Team is consistent after removal
    test("T23 — Team is consistent after member removal", async () => {
        const res = await request(app)
            .get(`/api/teams/${teamId}`)
            .set("Authorization", `Bearer ${citizenToken}`);

        expect(res.status).toBe(200);
        const citizen2Member = res.body.team.members.find(
            (m) => m.user_id === citizen2Id
        );
        // citizen2 should be REMOVED, not gone (soft-delete)
        expect(citizen2Member).toBeDefined();
        expect(citizen2Member.membership_status).toBe("REMOVED");
    });
});

// ===========================================================================
// STATUS TRANSITIONS (T24–T26)
// ===========================================================================

describe("M9 — Team Status", () => {
    // T24 — Authorized LEAD can change valid team status
    test("T24 — LEAD can transition FORMING → ACTIVE", async () => {
        const res = await request(app)
            .patch(`/api/teams/${teamId}/status`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ status: "ACTIVE" });

        expect(res.status).toBe(200);
        expect(res.body.team.status).toBe("ACTIVE");
    });

    // T25 — Invalid status transition rejected
    test("T25 — Invalid status transition rejected (400)", async () => {
        // ACTIVE → FORMING is not a valid transition
        const res = await request(app)
            .patch(`/api/teams/${teamId}/status`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ status: "FORMING" });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/cannot transition/i);
    });

    // T26 — Unauthorized status change rejected
    test("T26 — Non-LEAD cannot change team status (403)", async () => {
        const res = await request(app)
            .patch(`/api/teams/${teamId}/status`)
            .set("Authorization", `Bearer ${citizen2Token}`)
            .send({ status: "COMPLETED" });

        expect(res.status).toBe(403);
    });
});

// ===========================================================================
// M10 INTEGRATION (T27–T28)
// ===========================================================================

describe("M9 — M10 Integration", () => {
    // T27 — Solution can be submitted with team_id
    test("T27 — Solution can be linked to a team (team_id)", async () => {
        // Need a STUDENT/RESEARCHER to submit
        const res = await request(app)
            .post(`/api/problems/${problemId}/solutions`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                title: "[DEMO] Team-Linked Solution",
                description: "Solution submitted by a team member",
                team_id: teamId,
            });

        expect(res.status).toBe(201);
        expect(res.body.solution.team_id).toBe(teamId);
        expect(res.body.solution.problem_id).toBe(problemId);
    });

    // T28 — Existing solution flow still works without team_id
    test("T28 — Solution submission without team_id still works (regression)", async () => {
        const res = await request(app)
            .post(`/api/problems/${problemId}/solutions`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                title: "[DEMO] Standard Solution (no team)",
                description: "Standard solution without a team context",
            });

        expect(res.status).toBe(201);
        expect(res.body.solution.team_id).toBeNull();
        expect(res.body.solution.problem_id).toBe(problemId);
    });
});

// ===========================================================================
// REGRESSION (T29–T30)
// ===========================================================================

describe("M9 — Regression", () => {
    // T29 — Problem listing still works
    test("T29 — Problem listing regression (M2)", async () => {
        const res = await request(app)
            .get("/api/problems")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
    });

    // T30 — Notification system still works
    test("T30 — Notification system regression (M13)", async () => {
        const res = await request(app)
            .get("/api/notifications")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.notifications)).toBe(true);
    });
});
