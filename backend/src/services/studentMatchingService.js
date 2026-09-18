/**
 * studentMatchingService.js
 *
 * MODULE 5 — STUDENT MATCHING
 *
 * PURPOSE:
 *   Recommends relevant students for a problem based on the problem's
 *   `required_expertise` vs `student_profiles.skills`.
 *
 * MATCHING LOGIC:
 *   - Case-insensitive
 *   - Whitespace-normalized
 *   - score = (matched required expertise / total required expertise) * 100
 *   - Only returns score > 0
 *   - Sorts by score DESC, name ASC
 */

"use strict";

const pool = require("../config/db");
const { explainMatch } = require("./ai/aiOrchestrator");

/**
 * Parse and validate a numeric query-string parameter.
 * Returns null if the value was not supplied.
 * Throws an Error with a user-readable message if the value is invalid.
 */
function parseIntParam(value, name, min, max) {
    if (value === undefined || value === null || value === "") return null;

    const n = parseInt(value, 10);

    if (isNaN(n) || String(n) !== String(value).trim()) {
        throw new Error(`"${name}" must be a valid integer`);
    }

    if (n < min || n > max) {
        throw new Error(`"${name}" must be between ${min} and ${max}`);
    }

    return n;
}

/**
 * Build a human-readable explanation of why a student was recommended.
 */
function buildReason(matched, required) {
    if (matched === 0) return "No matching expertise areas.";
    return `Matched ${matched} of ${required} required expertise area${required !== 1 ? "s" : ""}`;
}

/**
 * Find student matches for a given problem.
 *
 * @param {number} problemId
 * @param {object} [options]
 * @param {number} [options.limit=10]
 * @returns {Promise<{ required_expertise: string[], matches: object[] } | null>}
 */
async function findStudentMatches(problemId, options = {}) {
    const { limit = 10 } = options;

    // 1. Load problem
    const problemResult = await pool.query(
        `SELECT id, required_expertise
         FROM problems
         WHERE id = $1`,
        [problemId]
    );

    if (problemResult.rows.length === 0) {
        return null; // 404
    }

    const problem = problemResult.rows[0];

    const required_expertise = Array.isArray(problem.required_expertise)
        ? problem.required_expertise
              .map((k) => (typeof k === "string" ? k.trim() : ""))
              .filter(Boolean)
        : [];

    if (required_expertise.length === 0) {
        return { required_expertise: [], matches: [] };
    }

    const totalRequired = required_expertise.length;

    // We build a normalized list to match against
    const normalizedRequired = required_expertise.map(s => s.toLowerCase());

    // 2. Fetch all student profiles that have skills
    // In a massive production system we would use GIN indexes on skills array,
    // but array intersection requires exact matching. For MVP, we fetch and
    // filter in Node since there are no ML embeddings or PG pg_trgm setups requested.
    // Actually, we can do it in SQL!
    // Using unnest and array_agg we can find overlap case insensitively.
    
    // We will do this efficiently in SQL:
    const query = `
        WITH required AS (
            SELECT unnest($1::text[]) AS req_name
        ),
        student_skills AS (
            SELECT sp.id AS profile_id, unnest(sp.skills) AS skill_name
            FROM student_profiles sp
            WHERE sp.skills IS NOT NULL AND array_length(sp.skills, 1) > 0
        ),
        matches AS (
            SELECT 
                ss.profile_id,
                COUNT(r.req_name)::int AS matched_count,
                ARRAY_AGG(ss.skill_name) AS matched_skills
            FROM student_skills ss
            JOIN required r ON LOWER(TRIM(ss.skill_name)) = LOWER(TRIM(r.req_name))
            GROUP BY ss.profile_id
        )
        SELECT 
            sp.id AS profile_id,
            sp.user_id,
            sp.institution_id,
            sp.department_id,
            sp.course,
            sp.graduation_year,
            u.name,
            m.matched_count,
            m.matched_skills
        FROM matches m
        JOIN student_profiles sp ON sp.id = m.profile_id
        JOIN users u ON u.id = sp.user_id
        ORDER BY m.matched_count DESC, u.name ASC
        LIMIT $2
    `;

    const matchResult = await pool.query(query, [normalizedRequired, limit]);

    const matches = matchResult.rows.map(row => {
        const score = Math.round((row.matched_count / totalRequired) * 100);
        return {
            student_id: row.user_id,
            profile_id: row.profile_id,
            institution_id: row.institution_id,
            department_id: row.department_id,
            course: row.course,
            graduation_year: row.graduation_year,
            name: row.name,
            matched_skills: row.matched_skills,
            score: score,
            reason: buildReason(row.matched_count, totalRequired)
        };
    });

    matches.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.name.localeCompare(b.name);
    });
    
    // Add AI Explanation for top 5 matches to avoid excessive latency
    for (let i = 0; i < Math.min(matches.length, 5); i++) {
        try {
            const aiExplanation = await explainMatch(required_expertise, matches[i].matched_skills || [], matches[i].score);
            if (aiExplanation) {
                matches[i].reason += "\nAI Insights: " + aiExplanation;
            }
        } catch (e) {
            console.warn(`[AI] Failed to explain match for student ${matches[i].student_id}:`, e.message);
        }
    }

    matches.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.name.localeCompare(b.name);
    });

    return {
        required_expertise: required_expertise,
        matches
    };
}

/**
 * Fetch profile and skills for an authenticated student.
 */
async function getStudentProfile(userId) {
    const query = `
        SELECT 
            u.id, 
            u.name, 
            u.email, 
            u.role,
            sp.id AS profile_id, 
            sp.course, 
            sp.graduation_year,
            sp.skills, 
            sp.institution_id, 
            sp.department_id,
            i.name AS institution_name, 
            d.name AS department_name
        FROM users u
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        LEFT JOIN institutions i ON i.id = sp.institution_id
        LEFT JOIN departments d ON d.id = sp.department_id
        WHERE u.id = $1
    `;

    const result = await pool.query(query, [userId]);
    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];
    const skills = Array.isArray(row.skills)
        ? row.skills.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean)
        : [];

    return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        profile_id: row.profile_id,
        course: row.course || "General Student Curriculum",
        graduation_year: row.graduation_year || new Date().getFullYear() + 1,
        institution_id: row.institution_id,
        institution_name: row.institution_name || "State University / College",
        department_id: row.department_id,
        department_name: row.department_name || "Department of Technology & Sciences",
        skills: skills,
    };
}

/**
 * Update skills for an authenticated student in student_profiles.
 */
async function updateStudentSkills(userId, skills) {
    const cleanSkills = Array.isArray(skills)
        ? [...new Set(skills.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean))]
        : [];

    const upsertQuery = `
        INSERT INTO student_profiles (user_id, skills)
        VALUES ($1, $2)
        ON CONFLICT (user_id)
        DO UPDATE SET skills = EXCLUDED.skills
        RETURNING *
    `;

    const result = await pool.query(upsertQuery, [userId, cleanSkills]);
    return cleanSkills;
}

/**
 * Normalization helper for skill matching
 */
function normalizeSkill(s) {
    return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Find problems that match the authenticated student's skills.
 * Demonstrates explainable matching:
 * Problem Requirement + Student Capability = Explainable Match
 */
async function findMatchingProblemsForStudent(userId, options = {}) {
    const { sort = "best_match" } = options;

    const profile = await getStudentProfile(userId);
    if (!profile) {
        return {
            student: null,
            total_matches: 0,
            matches: []
        };
    }

    const studentSkills = profile.skills || [];
    if (studentSkills.length === 0) {
        return {
            student: profile,
            total_matches: 0,
            matches: []
        };
    }

    // Load available problems with required expertise, excluding test-runner records
    const problemsResult = await pool.query(
        `SELECT id, title, description, category, subcategory, district, city, address,
                status, severity, urgency, priority_score, affected_people,
                required_expertise, ai_summary, created_at, updated_at
         FROM problems
         WHERE required_expertise IS NOT NULL 
           AND array_length(required_expertise, 1) > 0
           AND title !~* '^(M[0-9]+|Test\\s+M[0-9]+|Passport\\s+Problem|Cit[0-9]+|Auth[0-9]+)'
         ORDER BY id DESC`
    );

    const problems = problemsResult.rows;
    const normalizedStudentSkills = studentSkills.map((s) => ({
        original: s,
        normalized: normalizeSkill(s)
    }));

    const matches = [];

    for (const p of problems) {
        const requiredList = Array.isArray(p.required_expertise)
            ? p.required_expertise.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean)
            : [];

        if (requiredList.length === 0) continue;

        const matchedSkills = [];
        const missingSkills = [];

        for (const req of requiredList) {
            const normReq = normalizeSkill(req);
            // Check direct or partial match
            const match = normalizedStudentSkills.find((st) => {
                if (st.normalized === normReq) return true;
                if (normReq.length > 3 && st.normalized.includes(normReq)) return true;
                if (st.normalized.length > 3 && normReq.includes(st.normalized)) return true;
                return false;
            });

            if (match) {
                matchedSkills.push(req);
            } else {
                missingSkills.push(req);
            }
        }

        if (matchedSkills.length > 0) {
            const score = Math.round((matchedSkills.length / requiredList.length) * 100);
            
            let tier = "Potential Match";
            if (score >= 60 || matchedSkills.length >= 2) {
                tier = "Strong Match";
            } else if (score >= 25 || matchedSkills.length === 1) {
                tier = "Good Match";
            }

            const reason = `Your profile matches the problem's requirements in ${matchedSkills.join(", ")}.`;

            matches.push({
                id: p.id,
                title: p.title,
                description: p.description,
                category: p.category,
                subcategory: p.subcategory,
                district: p.district,
                city: p.city,
                address: p.address,
                status: p.status,
                affected_people: p.affected_people,
                ai_summary: p.ai_summary,
                required_expertise: requiredList,
                matched_skills: matchedSkills,
                missing_skills: missingSkills,
                matched_count: matchedSkills.length,
                total_required: requiredList.length,
                match_score: score,
                match_tier: tier,
                match_reason: reason,
                created_at: p.created_at,
                updated_at: p.updated_at
            });
        }
    }

    // Apply sorting
    if (sort === "newest") {
        matches.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sort === "recently_updated") {
        matches.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
    } else {
        // default: best_match
        matches.sort((a, b) => {
            if (b.match_score !== a.match_score) return b.match_score - a.match_score;
            if (b.matched_count !== a.matched_count) return b.matched_count - a.matched_count;
            return new Date(b.created_at) - new Date(a.created_at);
        });
    }

    // Add AI Explanation for top 5 matches
    for (let i = 0; i < Math.min(matches.length, 5); i++) {
        try {
            const aiExplanation = await explainMatch(matches[i].required_expertise, matches[i].matched_skills || [], matches[i].match_score);
            if (aiExplanation) {
                matches[i].match_reason += "\nAI Insights: " + aiExplanation;
            }
        } catch (e) {
            console.warn(`[AI] Failed to explain match for problem ${matches[i].id}:`, e.message);
        }
    }

    return {
        student: profile,
        total_matches: matches.length,
        matches: matches
    };
}

module.exports = {
    findStudentMatches,
    getStudentProfile,
    updateStudentSkills,
    findMatchingProblemsForStudent,
    parseIntParam
};

