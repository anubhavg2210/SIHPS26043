const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/db");

let authToken;
let citizenToken;
let authorityId;
let prob1Id, prob2Id, sol1Id, impl1Id;
const testSuffix = Date.now();

beforeAll(async () => {
    // Removed TRUNCATE to avoid breaking regression tests in other files.

    // 2. Create Authority
    const authRes = await request(app)
        .post("/api/auth/register")
        .send({
            name: "Analytics Authority",
            email: `analytics.auth_${testSuffix}@civicsync.gov.in`,
            password: "Password123!",
            role: "AUTHORITY",
            district: "Test District",
            department: "Analytics Dept"
        });
    authToken = authRes.body.token;
    authorityId = authRes.body.user.id;

    // 3. Create Citizen
    const citRes = await request(app)
        .post("/api/auth/register")
        .send({
            name: "Analytics Citizen",
            email: `analytics.citizen_${testSuffix}@civicsync.in`,
            password: "Password123!",
            role: "CITIZEN"
        });
    citizenToken = citRes.body.token;

    // 4. Seed analytics data
    // Problem 1: Resolved, Solved, Piloted, Impact Verified, Supported, Commented, Flagged Event
    const p1 = await pool.query(
        "INSERT INTO problems (title, description, category, severity, status, reporter_id, priority_score) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
        ["Water Issue", "Desc", "Water", 5, "RESOLVED", authorityId, 80]
    );
    prob1Id = p1.rows[0].id;

    // Problem 2: Active, High Priority, No solution yet
    const p2 = await pool.query(
        "INSERT INTO problems (title, description, category, severity, status, reporter_id, priority_score) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
        ["Road Issue", "Desc", "Infrastructure", 4, "UNDER_REVIEW", authorityId, 60]
    );
    prob2Id = p2.rows[0].id;

    // Seed Problem 1 Pipeline
    const s1 = await pool.query(
        "INSERT INTO solutions (problem_id, submitted_by, title, description, status) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [prob1Id, authorityId, "Sol 1", "Desc", "APPROVED"]
    );
    sol1Id = s1.rows[0].id;

    const i1 = await pool.query(
        "INSERT INTO solution_implementations (solution_id, problem_id, lead_authority_id, title, status, progress_percentage, target_start_date, target_end_date) VALUES ($1, $2, $3, $4, $5, $6, '2025-01-01', '2025-12-31') RETURNING id",
        [sol1Id, prob1Id, authorityId, "Pilot 1", "COMPLETED", 100]
    );
    impl1Id = i1.rows[0].id;

    await pool.query(
        "INSERT INTO implementation_impact_assessments (implementation_id, problem_id, verification_status, measurement_start_date, measurement_end_date) VALUES ($1, $2, $3, '2025-01-01', '2025-12-31')",
        [impl1Id, prob1Id, "VERIFIED"]
    );

    // Seed Community Data
    await pool.query("INSERT INTO problem_supports (problem_id, user_id) VALUES ($1, $2)", [prob1Id, authorityId]);
    await pool.query("INSERT INTO problem_comments (problem_id, user_id, comment) VALUES ($1, $2, $3)", [prob1Id, authorityId, "Comment 1"]);

    // Seed Trust Data
    await pool.query("INSERT INTO trust_events (user_id, event_type, reason, severity, status, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5, $6, $7)", [authorityId, "SPAM", "Test", "HIGH", "FLAGGED", "PROBLEM", prob1Id]);
});

afterAll(async () => {
    // Clean up specifically the data created in this test suite
    await pool.query("DELETE FROM trust_events WHERE user_id = $1", [authorityId]);
    await pool.query("DELETE FROM problem_comments WHERE problem_id IN ($1, $2)", [prob1Id, prob2Id]);
    await pool.query("DELETE FROM problem_supports WHERE problem_id IN ($1, $2)", [prob1Id, prob2Id]);
    await pool.query("DELETE FROM implementation_impact_assessments WHERE implementation_id = $1", [impl1Id]);
    await pool.query("DELETE FROM solution_implementations WHERE solution_id = $1", [sol1Id]);
    await pool.query("DELETE FROM solutions WHERE problem_id IN ($1, $2)", [prob1Id, prob2Id]);
    await pool.query("DELETE FROM problems WHERE id IN ($1, $2)", [prob1Id, prob2Id]);
    await pool.query("DELETE FROM users WHERE id = $1", [authorityId]);
});

describe("M17 - Analytics Dashboard", () => {
    test("1. Unauthorized analytics access is rejected (401 / 403)", async () => {
        const res1 = await request(app).get("/api/analytics/overview");
        expect(res1.statusCode).toBe(401);

        const res2 = await request(app)
            .get("/api/analytics/overview")
            .set("Authorization", `Bearer ${citizenToken}`);
        expect(res2.statusCode).toBe(403);
    });

    test("2. Overview endpoints counts match database", async () => {
        const res = await request(app)
            .get("/api/analytics/overview")
            .set("Authorization", `Bearer ${authToken}`);
        
        expect(res.statusCode).toBe(200);
        expect(Number(res.body.total_problems)).toBeGreaterThanOrEqual(2);
        expect(Number(res.body.active_problems)).toBeGreaterThanOrEqual(1);
        expect(Number(res.body.high_priority)).toBeGreaterThanOrEqual(2);
        expect(Number(res.body.resolved_problems)).toBeGreaterThanOrEqual(1);
    });

    test("3. Pipeline aggregation is correct", async () => {
        const res = await request(app)
            .get("/api/analytics/pipeline")
            .set("Authorization", `Bearer ${authToken}`);
        
        expect(res.statusCode).toBe(200);
        expect(Number(res.body.reported)).toBeGreaterThanOrEqual(2);
        expect(Number(res.body.solved)).toBeGreaterThanOrEqual(1);
        expect(Number(res.body.piloted)).toBeGreaterThanOrEqual(1);
        expect(Number(res.body.impact_verified)).toBeGreaterThanOrEqual(1);
    });

    test("4. Community aggregation is correct", async () => {
        const res = await request(app)
            .get("/api/analytics/community")
            .set("Authorization", `Bearer ${authToken}`);
        
        expect(res.statusCode).toBe(200);
        expect(Number(res.body.total_support)).toBeGreaterThanOrEqual(1);
        expect(Number(res.body.total_comments)).toBeGreaterThanOrEqual(1);
        expect(Array.isArray(res.body.top_categories)).toBe(true);
        expect(res.body.top_categories.length).toBeGreaterThan(0);
        expect(res.body.top_categories.some(c => c.category === 'Water' || c.category === 'Infrastructure')).toBe(true);
    });

    test("5. Trust aggregation is correct", async () => {
        const res = await request(app)
            .get("/api/analytics/trust")
            .set("Authorization", `Bearer ${authToken}`);
        
        expect(res.statusCode).toBe(200);
        expect(Number(res.body.total_flagged)).toBeGreaterThanOrEqual(1);
        expect(Number(res.body.pending_review)).toBeGreaterThanOrEqual(1);
        expect(Number(res.body.reviewed)).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(res.body.severity_breakdown)).toBe(true);
        expect(res.body.severity_breakdown.some(s => s.severity === 'HIGH' && Number(s.count) >= 1)).toBe(true);
    });
});
