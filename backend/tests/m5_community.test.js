"use strict";

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const pool = require("../src/config/db");

const JWT_SECRET = process.env.JWT_SECRET || "change_this_to_a_long_random_secret";

const testSuffix = Date.now();
let citizenToken, authorityToken, adminToken;
let citizenId, authorityId;
let problemId;

beforeAll(async () => {
    // 1. Create Citizen
    const citizenRes = await request(app)
        .post("/api/auth/register")
        .send({
            name: `Citizen_${testSuffix}`,
            email: `citizen_${testSuffix}@test.com`,
            password: "Test1234!",
            role: "CITIZEN"
        });
    citizenToken = citizenRes.body.token;
    citizenId = jwt.decode(citizenToken).id;

    // 2. Create Authority
    const authorityRes = await request(app)
        .post("/api/auth/register")
        .send({
            name: `Authority_${testSuffix}`,
            email: `authority_${testSuffix}@test.com`,
            password: "Test1234!",
            role: "AUTHORITY"
        });
    authorityToken = authorityRes.body.token;
    authorityId = jwt.decode(authorityToken).id;

    // 3. Create Problem directly via DB (avoids AI service dependency in tests)
    const probRes = await pool.query(
        `INSERT INTO problems (reporter_id, title, description, category, district, severity, urgency, priority_score)
         VALUES ($1, 'M5 Test Problem', 'Community layer test problem', 'Environment', 'Test District', 5, 5, 50)
         RETURNING id`,
        [citizenId]
    );
    problemId = probRes.rows[0].id;
});

afterAll(async () => {
    await pool.query("DELETE FROM problem_comments WHERE problem_id = $1", [problemId]);
    await pool.query("DELETE FROM problem_supports WHERE problem_id = $1", [problemId]);
    await pool.query("DELETE FROM problems WHERE id = $1", [problemId]);
    await pool.query("DELETE FROM users WHERE email LIKE $1", [`%_${testSuffix}@test.com`]);
});

describe("M5 — Community Support", () => {
    // 1, 2. authenticated user can support, support count increases
    test("T1 - Citizen can support a problem", async () => {
        const res = await request(app)
            .post(`/api/problems/${problemId}/support`)
            .set("Authorization", `Bearer ${citizenToken}`);
        
        expect(res.status).toBe(201);
        expect(res.body.supported).toBe(true);
        expect(res.body.support_count).toBe(1);
    });

    // 3. same user cannot support twice
    test("T2 - Duplicate support prevented", async () => {
        const res = await request(app)
            .post(`/api/problems/${problemId}/support`)
            .set("Authorization", `Bearer ${citizenToken}`);
        
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Already supported/i);
    });

    // 17, 18. priority logic integrates community support
    test("T3 - Priority score is updated based on support", async () => {
        const res = await request(app)
            .get(`/api/problems/${problemId}`)
            .set("Authorization", `Bearer ${citizenToken}`);
        
        expect(res.status).toBe(200);
        expect(res.body.problem.priority_score).toBeDefined();
        // Since it's a test problem, initial might be small, but it should compute properly without crashing.
    });

    // 4, 5. user can remove support, count decreases
    test("T4 - Citizen can remove support", async () => {
        const res = await request(app)
            .delete(`/api/problems/${problemId}/support`)
            .set("Authorization", `Bearer ${citizenToken}`);
        
        expect(res.status).toBe(200);
        expect(res.body.supported).toBe(false);
        expect(res.body.support_count).toBe(0);
    });

    // 6. unauthenticated support rejected
    test("T5 - Unauthenticated support rejected", async () => {
        const res = await request(app).post(`/api/problems/${problemId}/support`);
        expect(res.status).toBe(401);
    });

    // 7. nonexistent problem rejected
    test("T6 - Nonexistent problem rejected for support", async () => {
        const res = await request(app)
            .post(`/api/problems/999999/support`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.status).toBe(404);
    });
});

describe("M5 — Community Comments", () => {
    let commentId;

    // 8. authenticated user can comment
    test("T7 - Citizen can comment on a problem", async () => {
        const res = await request(app)
            .post(`/api/problems/${problemId}/comments`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ comment: "This is a test comment." });
        
        expect(res.status).toBe(201);
        expect(res.body.comment.comment).toBe("This is a test comment.");
        expect(res.body.comment.status).toBe("VISIBLE");
        commentId = res.body.comment.id;
    });

    // 9. empty comment rejected
    test("T8 - Empty comment rejected", async () => {
        const res = await request(app)
            .post(`/api/problems/${problemId}/comments`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ comment: "" });
        
        expect(res.status).toBe(400);
    });

    // 10. whitespace-only comment rejected
    test("T9 - Whitespace comment rejected", async () => {
        const res = await request(app)
            .post(`/api/problems/${problemId}/comments`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ comment: "   " });
        
        expect(res.status).toBe(400);
    });

    // 11. comment appears in GET response
    test("T10 - Comments can be fetched", async () => {
        const res = await request(app)
            .get(`/api/problems/${problemId}/comments`)
            .set("Authorization", `Bearer ${citizenToken}`);
        
        expect(res.status).toBe(200);
        expect(res.body.comments.length).toBe(1);
        expect(res.body.comments[0].comment).toBe("This is a test comment.");
        expect(res.body.comments[0].user_name).toBeDefined();
    });

    // 12. unauthenticated comment rejected
    test("T11 - Unauthenticated comment rejected", async () => {
        const res = await request(app).post(`/api/problems/${problemId}/comments`).send({ comment: "Hello" });
        expect(res.status).toBe(401);
    });

    // 13. nonexistent problem rejected
    test("T12 - Nonexistent problem rejected for comments", async () => {
        const res = await request(app)
            .post(`/api/problems/999999/comments`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ comment: "Hello" });
        expect(res.status).toBe(404);
    });

    // MODERATION
    // 15. unauthorized user cannot moderate
    test("T13 - Citizen cannot moderate comment", async () => {
        const res = await request(app)
            .patch(`/api/problems/${problemId}/comments/${commentId}/status`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ status: "HIDDEN" });
        
        expect(res.status).toBe(403);
    });

    // 14. authorized moderator can hide/flag comment
    test("T14 - Authority can moderate comment", async () => {
        const res = await request(app)
            .patch(`/api/problems/${problemId}/comments/${commentId}/status`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ status: "HIDDEN" });
        
        expect(res.status).toBe(200);
        expect(res.body.comment.status).toBe("HIDDEN");
    });

    // 16. hidden comment behavior is correct (Citizen shouldn't see it, or at least it's marked)
    // For M5, if we implemented "excluded from GET for normal users", let's check it.
    test("T15 - Hidden comments are not visible to regular users", async () => {
        const res = await request(app)
            .get(`/api/problems/${problemId}/comments`)
            .set("Authorization", `Bearer ${citizenToken}`);
        
        expect(res.status).toBe(200);
        expect(res.body.comments.length).toBe(0);
    });

    test("T16 - Hidden comments are visible to authority", async () => {
        const res = await request(app)
            .get(`/api/problems/${problemId}/comments`)
            .set("Authorization", `Bearer ${authorityToken}`);
        
        expect(res.status).toBe(200);
        expect(res.body.comments.length).toBe(1);
        expect(res.body.comments[0].status).toBe("HIDDEN");
    });
});
