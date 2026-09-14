"use strict";

const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/db");

const testSuffix = Date.now();
let citizenToken, authorityToken, adminToken;
let citizenId, authorityId;
let problemId, implementationId, impactAssessmentId;

beforeAll(async () => {
    // 1. Create test users
    const cRes = await request(app).post("/api/auth/register").send({
        name: `Cit_${testSuffix}`, email: `c_${testSuffix}@t.com`, password: "Pass123!", role: "CITIZEN"
    });
    citizenToken = cRes.body.token;
    citizenId = cRes.body.user.id;

    const authRes = await request(app).post("/api/auth/register").send({
        name: `Auth_${testSuffix}`, email: `a_${testSuffix}@t.com`, password: "Pass123!", role: "AUTHORITY"
    });
    authorityToken = authRes.body.token;
    authorityId = authRes.body.user.id;

    // 2. Create problem
    // 2. Create problem directly in DB
    const pRes = await pool.query(
        `INSERT INTO problems (reporter_id, title, description, category, district)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [citizenId, `M13 Problem ${testSuffix}`, "Test M13", "ENVIRONMENT", "Ranchi"]
    );
    problemId = pRes.rows[0].id;

    // 2.5 Create Solution directly in DB
    const sRes = await pool.query(
        `INSERT INTO solutions (problem_id, submitted_by, title, description)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [problemId, citizenId, `M13 Solution ${testSuffix}`, "Test M13 Solution"]
    );
    const solutionId = sRes.rows[0].id;

    // 3. Create Implementation directly in DB
    const iRes = await pool.query(
        `INSERT INTO solution_implementations (solution_id, problem_id, lead_authority_id, title, status, target_start_date, target_end_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [solutionId, problemId, authorityId, `M13 Impl ${testSuffix}`, "PILOT", "2026-01-01", "2026-12-31"]
    );
    implementationId = iRes.rows[0].id;

    // 4. Create Impact Assessment directly in DB
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

describe("M13 - Verification & Confidence", () => {
    let implEvId, impactEvId;

    test("Citizen can submit implementation evidence (defaults to PENDING)", async () => {
        const res = await request(app)
            .post(`/api/implementations/${implementationId}/evidence`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({
                title: "Impl Evidence",
                evidence_type: "PHOTO",
                file_url: "http://impl.png"
            });
        
        expect(res.statusCode).toBe(201);
        expect(res.body.evidence.verification_status).toBe("PENDING");
        implEvId = res.body.evidence.id;
    });

    test("Citizen can submit impact evidence (defaults to PENDING)", async () => {
        const res = await request(app)
            .post(`/api/impact-assessments/${impactAssessmentId}/evidence`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({
                title: "Impact Evidence",
                evidence_type: "LAB_REPORT",
                file_url: "http://lab.pdf"
            });
        
        expect(res.statusCode).toBe(201);
        expect(res.body.evidence.verification_status).toBe("PENDING");
        impactEvId = res.body.evidence.id;
    });

    test("Citizen CANNOT verify implementation evidence", async () => {
        const res = await request(app)
            .patch(`/api/implementations/${implementationId}/evidence/${implEvId}/verify`)
            .set("Authorization", `Bearer ${citizenToken}`)
            .send({ status: "VERIFIED" });
        expect(res.statusCode).toBe(403);
    });

    test("Authority CAN verify implementation evidence", async () => {
        const res = await request(app)
            .patch(`/api/implementations/${implementationId}/evidence/${implEvId}/verify`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ status: "VERIFIED", remarks: "Looks good" });
        expect(res.statusCode).toBe(200);
        expect(res.body.evidence.verification_status).toBe("VERIFIED");
        expect(res.body.evidence.verified_by).toBe(authorityId);
        expect(res.body.evidence.reviewer_remarks).toBe("Looks good");
    });

    test("Cannot verify already verified evidence", async () => {
        const res = await request(app)
            .patch(`/api/implementations/${implementationId}/evidence/${implEvId}/verify`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ status: "REJECTED" });
        expect(res.statusCode).toBe(400); // Because it is not PENDING anymore
    });

    test("Authority CAN reject impact evidence", async () => {
        const res = await request(app)
            .patch(`/api/impact-assessments/${impactAssessmentId}/evidence/${impactEvId}/verify`)
            .set("Authorization", `Bearer ${authorityToken}`)
            .send({ status: "REJECTED", remarks: "Invalid lab report" });
        expect(res.statusCode).toBe(200);
        expect(res.body.evidence.verification_status).toBe("REJECTED");
    });

    test("getEvidence returns correctly joined verification fields", async () => {
        const res = await request(app)
            .get(`/api/impact-assessments/${impactAssessmentId}/evidence`)
            .set("Authorization", `Bearer ${citizenToken}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.evidence[0].verification_status).toBe("REJECTED");
        expect(res.body.evidence[0].verified_by.id).toBe(authorityId);
        expect(res.body.evidence[0].verified_by.name).toBeDefined();
    });
});
