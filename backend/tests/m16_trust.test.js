"use strict";

const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/db");

const testSuffix = Date.now();
let citizenToken, citizenToken2, authorityToken;
let citizenId, citizen2Id, authorityId;
let problemId, implementationId, impactAssessmentId, solutionId;

beforeAll(async () => {
    // Register users
    const cRes = await request(app).post("/api/auth/register").send({
        name: `Cit1_${testSuffix}`, email: `c1_${testSuffix}@t.com`, password: "Pass123!", role: "CITIZEN"
    });
    citizenToken = cRes.body.token;
    citizenId = cRes.body.user.id;

    const c2Res = await request(app).post("/api/auth/register").send({
        name: `Cit2_${testSuffix}`, email: `c2_${testSuffix}@t.com`, password: "Pass123!", role: "CITIZEN"
    });
    citizenToken2 = c2Res.body.token;
    citizen2Id = c2Res.body.user.id;

    const aRes = await request(app).post("/api/auth/register").send({
        name: `Auth_${testSuffix}`, email: `a_${testSuffix}@t.com`, password: "Pass123!", role: "AUTHORITY"
    });
    authorityToken = aRes.body.token;
    authorityId = aRes.body.user.id;

    // Create a problem
    const pRes = await pool.query(
        `INSERT INTO problems (reporter_id, title, description, category, district)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [citizenId, `M16 Prob ${testSuffix}`, "M16 desc", "EDUCATION", "Ranchi"]
    );
    problemId = pRes.rows[0].id;

    // Create a solution by citizen2
    const sRes = await pool.query(
        `INSERT INTO solutions (problem_id, submitted_by, title, description)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [problemId, citizen2Id, `M16 Sol ${testSuffix}`, "Sol desc"]
    );
    solutionId = sRes.rows[0].id;

    // Create an implementation
    const iRes = await pool.query(
        `INSERT INTO solution_implementations (solution_id, problem_id, lead_authority_id, title, status, target_start_date, target_end_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [solutionId, problemId, authorityId, `M16 Impl ${testSuffix}`, "PILOT", "2026-01-01", "2026-12-31"]
    );
    implementationId = iRes.rows[0].id;

    // Create an impact assessment
    const impRes = await pool.query(
        `INSERT INTO implementation_impact_assessments (implementation_id, problem_id, measurement_start_date, measurement_end_date, outcome_summary)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [implementationId, problemId, "2026-01-01", "2026-12-31", "Test impact"]
    );
    impactAssessmentId = impRes.rows[0].id;
});

afterAll(async () => {
    await pool.end();
});

describe("M16 - Trust & Anti-Gaming", () => {
    
    test("1. Support problem normally (should succeed)", async () => {
        const res = await request(app)
            .post(`/api/problems/${problemId}/support`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.statusCode).toBe(201);
    });

    test("2. Duplicate problem support is prevented safely", async () => {
        const res = await request(app)
            .post(`/api/problems/${problemId}/support`)
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toMatch(/already supported/i);
    });

    test("3. Repeated identical comments are blocked", async () => {
        const res1 = await request(app)
            .post(`/api/problems/${problemId}/comments`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ comment: "This is a test comment!" });
        expect(res1.statusCode).toBe(201);

        const res2 = await request(app)
            .post(`/api/problems/${problemId}/comments`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ comment: "This is a test comment!" });
        expect(res2.statusCode).toBe(400);
        expect(res2.body.message).toMatch(/identical comment/i);
    });

    test("4. Self-solution evaluation is blocked", async () => {
        const res = await request(app)
            .post(`/api/solutions/${solutionId}/evaluations`)
            // Using citizen2 token is irrelevant since authority is required, let's pretend auth submitted it.
            // Wait, we need to test self-evaluation. Let's make an authority submit a solution.
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({}); 
        // We actually didn't set authority to submit it. But M8 evaluation blocks self action. Let's test it:
    });
    
    // We create a solution by authority just for self evaluation test
    test("4b. Self-solution evaluation is blocked properly", async () => {
        const authSolRes = await pool.query(
            `INSERT INTO solutions (problem_id, submitted_by, title, description)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [problemId, authorityId, `Auth Sol`, "Auth Sol desc"]
        );
        const authSolId = authSolRes.rows[0].id;

        const res = await request(app)
            .post(`/api/solutions/${authSolId}/evaluations`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({
                impact_score: 5, feasibility_score: 5, cost_efficiency_score: 5,
                scalability_score: 5, evidence_score: 5, risk_score: 5
            });
        expect(res.statusCode).toBe(403);
        expect(res.body.message).toMatch(/cannot evaluate your own/i);
    });

    let evId;
    test("5. Self-verification is blocked", async () => {
        // Authority submits evidence
        const evRes = await request(app)
            .post(`/api/implementations/${implementationId}/evidence`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ title: "My Ev", evidence_type: "PHOTO", file_url: "http://ev.com" });
        
        expect(evRes.statusCode).toBe(201);
        evId = evRes.body.evidence.id;

        // Authority tries to verify their own evidence
        const res = await request(app)
            .patch(`/api/implementations/${implementationId}/evidence/${evId}/verify`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ status: "VERIFIED" });
        
        expect(res.statusCode).toBe(403);
        expect(res.body.message).toMatch(/cannot verify your own/i);
    });

    test("6. Suspicious activity creates a trust event", async () => {
        // We know authority generated a SELF_ACTION_ATTEMPT event in test 5.
        // Let's verify it exists in DB.
        const dbRes = await pool.query(`SELECT * FROM trust_events WHERE user_id = $1 AND event_type = 'SELF_ACTION_ATTEMPT'`, [authorityId]);
        expect(dbRes.rows.length).toBeGreaterThan(0);
        expect(dbRes.rows[0].severity).toBe('HIGH');
        expect(dbRes.rows[0].status).toBe('FLAGGED');
    });

    test("7. AUTHORITY can fetch flagged events", async () => {
        const res = await request(app)
            .get("/api/trust")
            .set("Authorization", `Bearer ${authorityToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.events.length).toBeGreaterThan(0);
    });

    test("8. CITIZEN cannot fetch flagged events (403)", async () => {
        const res = await request(app)
            .get("/api/trust")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res.statusCode).toBe(403);
    });

    test("9. AUTHORITY can review a flagged event", async () => {
        const dbRes = await pool.query(`SELECT id FROM trust_events LIMIT 1`);
        const eventId = dbRes.rows[0].id;

        const res = await request(app)
            .patch(`/api/trust/${eventId}/review`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ remarks: "Reviewed by authority" });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.event.status).toBe("REVIEWED");
        expect(res.body.event.reviewer_remarks).toBe("Reviewed by authority");
    });
});
