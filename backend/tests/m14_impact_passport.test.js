const request = require("supertest");
const app = require("../src/app");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "change_this_to_a_long_random_secret";
const pool = require("../src/config/db");

let tokenCitizen;
let tokenAuthority;
let testProblemId;
let implementationId;
let assessmentId;
let teamId;

beforeAll(async () => {
    // 1. Create users
    await pool.query(`INSERT INTO users (id, name, email, password_hash, role) VALUES 
        (701, 'Passport Citizen', 'passport.citizen@example.com', 'hash', 'CITIZEN'),
        (702, 'Passport Authority', 'passport.auth@example.com', 'hash', 'AUTHORITY'),
        (703, 'Passport Expert', 'passport.expert@example.com', 'hash', 'RESEARCHER')
        ON CONFLICT (id) DO NOTHING
    `);

    // 2. Generate tokens manually
    tokenCitizen = jwt.sign({ id: 701, role: 'CITIZEN' }, JWT_SECRET, { expiresIn: "1h" });
    tokenAuthority = jwt.sign({ id: 702, role: 'AUTHORITY' }, JWT_SECRET, { expiresIn: "1h" });

    // 3. Create a problem
    const probRes = await pool.query(`
        INSERT INTO problems (reporter_id, title, description, category, subcategory, status, priority_score, ai_summary, severity) 
        VALUES (701, 'Passport Problem', 'Desc', 'Water', 'Water Quality', 'RESOLVED', 85, 'AI summary here', 3)
        RETURNING id
    `);
    testProblemId = probRes.rows[0].id;

    // 4. Create community support
    await pool.query(`INSERT INTO problem_supports (problem_id, user_id) VALUES ($1, 701) ON CONFLICT DO NOTHING`, [testProblemId]);

    // 5. Create matching (Dynamic, no table insert needed)
    // await pool.query(`INSERT INTO faculty_matches (problem_id, user_id, match_score) VALUES ($1, 703, 90)`, [testProblemId]);

    // 6. Create team
    const teamRes = await pool.query(`
        INSERT INTO collaboration_teams (problem_id, name, created_by, status) 
        VALUES ($1, 'Passport Team', 703, 'ACTIVE')
        RETURNING id
    `, [testProblemId]);
    teamId = teamRes.rows[0].id;

    await pool.query(`INSERT INTO collaboration_team_members (team_id, user_id, role, membership_status) VALUES ($1, 703, 'LEAD', 'ACTIVE')`, [teamId]);

    // 7. Create solution
    await pool.query(`
        INSERT INTO solutions (problem_id, submitted_by, team_id, title, description, status) 
        VALUES ($1, 703, $2, 'Passport Solution', 'Sol desc', 'APPROVED')
    `, [testProblemId, teamId]);

    // 8. Create implementation
    const implRes = await pool.query(`
        INSERT INTO solution_implementations (problem_id, solution_id, lead_authority_id, title, status, progress_percentage, target_start_date, target_end_date) 
        VALUES ($1, (SELECT id FROM solutions WHERE problem_id = $1 LIMIT 1), 701, 'Passport Pilot', 'COMPLETED', 100, CURRENT_DATE, CURRENT_DATE)
        RETURNING id
    `, [testProblemId]);
    implementationId = implRes.rows[0].id;

    // 9. Create impact assessment
    const assessRes = await pool.query(`
        INSERT INTO implementation_impact_assessments (implementation_id, problem_id, verification_status, impact_score, measurement_start_date, measurement_end_date) 
        VALUES ($1, $2, 'VERIFIED', 95, CURRENT_DATE, CURRENT_DATE)
        RETURNING id
    `, [implementationId, testProblemId]);
    assessmentId = assessRes.rows[0].id;

    // 10. Create impact metrics
    await pool.query(`
        INSERT INTO impact_metrics (impact_assessment_id, metric_name, baseline_value, target_value, actual_value, unit) 
        VALUES ($1, 'Contamination', 50, 10, 5, 'mg/L')
    `, [assessmentId]);

    // 11. Create verification evidence
    await pool.query(`
        INSERT INTO verification_evidence (implementation_id, submitted_by, title, evidence_type, verification_status, reference) 
        VALUES ($1, 701, 'Lab Report', 'LAB_REPORT', 'VERIFIED', 'https://example.com/lab')
    `, [implementationId]);

    // 12. Create community feedback
    await pool.query(`
        INSERT INTO impact_citizen_feedback (impact_assessment_id, user_id, rating, is_resolved, comment) 
        VALUES ($1, 702, 5, true, 'Great improvement')
    `, [assessmentId]);
});

afterAll(async () => {
    // Cleanup is handled by test DB reset if needed, but we can leave it.
});

describe("M14 Impact Passport Tests", () => {
    it("1-4. Should retrieve passport for valid problem with authentication", async () => {
        const res = await request(app)
            .get(`/api/problems/${testProblemId}/impact-passport`)
            .set("Authorization", `Bearer ${tokenCitizen}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.passport).toBeDefined();
        expect(res.body.passport.problem.title).toBe("Passport Problem");
    });

    it("2. Should return 404 for nonexistent problem", async () => {
        const res = await request(app)
            .get(`/api/problems/999999/impact-passport`)
            .set("Authorization", `Bearer ${tokenCitizen}`);
        
        expect(res.statusCode).toBe(404);
    });

    it("3. Should return 401 if unauthorized", async () => {
        const res = await request(app)
            .get(`/api/problems/${testProblemId}/impact-passport`);
        
        expect(res.statusCode).toBe(401);
    });

    it("5-6. Should include AI data if available", async () => {
        const res = await request(app)
            .get(`/api/problems/${testProblemId}/impact-passport`)
            .set("Authorization", `Bearer ${tokenCitizen}`);
        
        expect(res.body.passport.aiAnalysis).toBeDefined();
        expect(res.body.passport.aiAnalysis.summary).toBe("AI summary here");
    });

    it("7-8. Should include community support count and priority", async () => {
        const res = await request(app)
            .get(`/api/problems/${testProblemId}/impact-passport`)
            .set("Authorization", `Bearer ${tokenCitizen}`);
        
        expect(res.body.passport.community.support_count).toBeGreaterThanOrEqual(1);
        expect(res.body.passport.priority.score).toBe(85);
        expect(res.body.passport.priority.level).toBe("CRITICAL");
    });

    it("9-10. Should include matching information object (might be empty)", async () => {
        const res = await request(app)
            .get(`/api/problems/${testProblemId}/impact-passport`)
            .set("Authorization", `Bearer ${tokenCitizen}`);
        
        expect(res.body.passport.matching).toBeDefined();
    });

    it("11-12. Should include collaboration team information", async () => {
        const res = await request(app)
            .get(`/api/problems/${testProblemId}/impact-passport`)
            .set("Authorization", `Bearer ${tokenCitizen}`);
        
        expect(res.body.passport.collaboration.team_name).toBe("Passport Team");
        expect(res.body.passport.collaboration.members.length).toBeGreaterThanOrEqual(1);
    });

    it("13-14. Should include solution information", async () => {
        const res = await request(app)
            .get(`/api/problems/${testProblemId}/impact-passport`)
            .set("Authorization", `Bearer ${tokenCitizen}`);
        
        expect(res.body.passport.solutions.length).toBeGreaterThanOrEqual(1);
        expect(res.body.passport.solutions[0].title).toBe("Passport Solution");
    });

    it("15-16. Should include implementation information", async () => {
        const res = await request(app)
            .get(`/api/problems/${testProblemId}/impact-passport`)
            .set("Authorization", `Bearer ${tokenCitizen}`);
        
        expect(res.body.passport.implementation.title).toBe("Passport Pilot");
        expect(res.body.passport.implementation.progress).toBe(100);
    });

    it("17-21. Should include verification evidence and status", async () => {
        const res = await request(app)
            .get(`/api/problems/${testProblemId}/impact-passport`)
            .set("Authorization", `Bearer ${tokenCitizen}`);
        
        expect(res.body.passport.evidence.length).toBeGreaterThanOrEqual(1);
        expect(res.body.passport.evidence[0].title).toBe("Lab Report");
        expect(res.body.passport.evidence[0].status).toBe("VERIFIED");
        expect(res.body.passport.verification.status).toBe("VERIFIED");
    });

    it("22-24. Should include impact metrics", async () => {
        const res = await request(app)
            .get(`/api/problems/${testProblemId}/impact-passport`)
            .set("Authorization", `Bearer ${tokenCitizen}`);
        
        expect(res.body.passport.impact.score).toBe("95.00");
        expect(res.body.passport.impact.status).toBe("VERIFIED");
        expect(res.body.passport.impact.metrics.length).toBeGreaterThanOrEqual(1);
        expect(res.body.passport.impact.metrics[0].metric_name).toBe("Contamination");
    });

    it("25. Should derive outcome status properly", async () => {
        const res = await request(app)
            .get(`/api/problems/${testProblemId}/impact-passport`)
            .set("Authorization", `Bearer ${tokenCitizen}`);
        
        expect(res.body.passport.outcome.status).toBe("COMPLETED");
    });

    it("26-27. Should not expose sensitive user data", async () => {
        const res = await request(app)
            .get(`/api/problems/${testProblemId}/impact-passport`)
            .set("Authorization", `Bearer ${tokenCitizen}`);
        
        const passportStr = JSON.stringify(res.body.passport);
        expect(passportStr).not.toMatch(/password/i);
        expect(passportStr).not.toMatch(/email/i);
    });
});
