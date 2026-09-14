const pool = require("../config/db");

async function generateImpactPassport(problemId) {
    const passport = {
        problem: null,
        aiAnalysis: null,
        priority: null,
        community: null,
        matching: null,
        collaboration: null,
        solutions: [],
        implementation: null,
        evidence: [],
        verification: null,
        impact: null,
        outcome: {
            status: "IN_PROGRESS",
            generated_at: new Date().toISOString()
        }
    };

    // 1. Problem + AI Analysis + Priority
    const probRes = await pool.query(`
        SELECT 
            id, title, description, category, subcategory, 
            district, city, address, latitude, longitude, 
            affected_people, ai_summary, ai_keywords, required_expertise,
            severity, urgency, ai_confidence, priority_score, status, created_at
        FROM problems WHERE id = $1
    `, [problemId]);

    if (probRes.rows.length === 0) {
        throw new Error("Problem not found");
    }
    const prob = probRes.rows[0];

    passport.problem = {
        id: prob.id,
        title: prob.title,
        description: prob.description,
        category: prob.category,
        subcategory: prob.subcategory,
        location: [prob.address, prob.city, prob.district].filter(Boolean).join(", "),
        reported_at: prob.created_at,
        status: prob.status
    };

    if (prob.ai_summary) {
        passport.aiAnalysis = {
            domain: prob.category,
            subdomain: prob.subcategory,
            severity: prob.severity,
            urgency: prob.urgency,
            required_expertise: prob.required_expertise,
            summary: prob.ai_summary
        };
    }

    if (prob.priority_score) {
        passport.priority = {
            score: prob.priority_score,
            level: prob.priority_score > 75 ? "CRITICAL" : prob.priority_score > 50 ? "HIGH" : "NORMAL"
        };
    }

    // 2. Community
    const supportRes = await pool.query(`SELECT COUNT(*) as count FROM problem_supports WHERE problem_id = $1`, [problemId]);
    passport.community = {
        support_count: parseInt(supportRes.rows[0].count, 10)
    };

    // 3. Matching
    const { findFacultyMatches } = require("./facultyMatchingService");
    const { findStudentMatches } = require("./studentMatchingService");
    const { findResearcherMatches } = require("./researcherMatchingService");
    const { findStartupMatches } = require("./innovationMatchingService");

    const matching = {};
    
    try {
        const fMatches = await findFacultyMatches(problemId, { limit: 1 });
        if (fMatches && fMatches.matches.length > 0) matching.faculty_matched = true;
    } catch(e) {}

    try {
        const sMatches = await findStudentMatches(problemId, { limit: 1 });
        if (sMatches && sMatches.matches.length > 0) matching.students_matched = true;
    } catch(e) {}

    try {
        const rMatches = await findResearcherMatches(problemId, { limit: 1 });
        if (rMatches && rMatches.matches.length > 0) matching.researchers_matched = true;
    } catch(e) {}

    try {
        const iMatches = await findStartupMatches(problemId, { limit: 1 });
        if (iMatches && iMatches.matches.length > 0) matching.startups_msmes_matched = true;
    } catch(e) {}
    
    passport.matching = matching;

    // 4. Collaboration Team
    const teamRes = await pool.query(`
        SELECT id, name, status 
        FROM collaboration_teams 
        WHERE problem_id = $1 AND status != 'ARCHIVED'
        ORDER BY created_at DESC LIMIT 1
    `, [problemId]);

    if (teamRes.rows.length > 0) {
        const team = teamRes.rows[0];
        const membersRes = await pool.query(`
            SELECT tm.role as role_name, tm.membership_status as status, u.role as user_role
            FROM collaboration_team_members tm
            JOIN users u ON tm.user_id = u.id
            WHERE tm.team_id = $1 AND tm.membership_status = 'ACTIVE'
        `, [team.id]);

        passport.collaboration = {
            team_name: team.name,
            status: team.status,
            members: membersRes.rows.map(m => ({ role: m.role_name, user_type: m.user_role }))
        };
    }

    // 5. Solutions
    const solRes = await pool.query(`
        SELECT id, title, description as summary, status, team_id 
        FROM solutions 
        WHERE problem_id = $1 
        ORDER BY created_at DESC
    `, [problemId]);
    
    passport.solutions = solRes.rows.map(s => ({
        id: s.id,
        title: s.title,
        summary: s.summary,
        status: s.status,
        has_team: !!s.team_id
    }));

    const approvedSol = passport.solutions.find(s => ['APPROVED', 'SELECTED'].includes(s.status));

    // 6. Implementation
    const implRes = await pool.query(`
        SELECT id, title, status, progress_percentage, target_start_date, target_end_date 
        FROM solution_implementations 
        WHERE problem_id = $1 
        ORDER BY created_at DESC LIMIT 1
    `, [problemId]);

    if (implRes.rows.length > 0) {
        const impl = implRes.rows[0];
        passport.implementation = {
            id: impl.id,
            title: impl.title,
            status: impl.status,
            start_date: impl.target_start_date,
            end_date: impl.target_end_date,
            partner: "N/A", // Handled externally if needed
            progress: impl.progress_percentage
        };

        // 7. Evidence
        const evRes = await pool.query(`
            SELECT id, title, evidence_type, verification_status, reviewer_remarks, verified_at 
            FROM verification_evidence 
            WHERE implementation_id = $1 OR impact_assessment_id IN (
                SELECT id FROM implementation_impact_assessments WHERE problem_id = $2
            )
        `, [impl.id, problemId]);

        passport.evidence = evRes.rows.map(e => ({
            id: e.id,
            title: e.title,
            type: e.evidence_type,
            status: e.verification_status,
            remarks: e.reviewer_remarks,
            verified_on: e.verified_at
        }));

        const verifiedEvidence = passport.evidence.filter(e => e.status === 'VERIFIED');
        if (verifiedEvidence.length > 0) {
            passport.verification = {
                status: "VERIFIED",
                items: verifiedEvidence.length
            };
        }
    }

    // 8. Impact
    const impactRes = await pool.query(`
        SELECT id, impact_score, verification_status 
        FROM implementation_impact_assessments 
        WHERE problem_id = $1 
        ORDER BY created_at DESC LIMIT 1
    `, [problemId]);

    if (impactRes.rows.length > 0) {
        const impact = impactRes.rows[0];
        
        const metricsRes = await pool.query(`
            SELECT id, metric_name, baseline_value, target_value, actual_value, unit 
            FROM impact_metrics 
            WHERE impact_assessment_id = $1
        `, [impact.id]);

        const feedbackRes = await pool.query(`
            SELECT rating, comment as comments 
            FROM impact_citizen_feedback 
            WHERE impact_assessment_id = $1
        `, [impact.id]);

        passport.impact = {
            score: impact.impact_score,
            status: impact.verification_status,
            metrics: metricsRes.rows,
            feedback: feedbackRes.rows.map(f => ({
                rating: f.rating,
                aspect: f.aspect,
                comments: f.comments
            }))
        };
    }

    // 9. Deduce final outcome status
    if (passport.impact && passport.impact.status === 'VERIFIED') {
        passport.outcome.status = 'COMPLETED';
    } else if (passport.impact) {
        passport.outcome.status = 'IMPACT_MEASURED';
    } else if (passport.implementation && ['COMPLETED', 'SUSTAINED'].includes(passport.implementation.status)) {
        passport.outcome.status = 'IMPLEMENTED';
    } else if (passport.implementation) {
        passport.outcome.status = 'IMPLEMENTING';
    } else if (approvedSol) {
        passport.outcome.status = 'SOLUTION_APPROVED';
    } else if (passport.solutions.length > 0) {
        passport.outcome.status = 'SOLUTIONS_PROPOSED';
    } else if (passport.collaboration) {
        passport.outcome.status = 'TEAM_FORMED';
    } else {
        passport.outcome.status = 'IN_PROGRESS';
    }

    return passport;
}

module.exports = {
    generateImpactPassport
};
