/**
 * rootCauseService.js
 *
 * MODULE 11 — ROOT CAUSE ANALYSIS SERVICE
 *
 * Provides:
 *   - AI / Heuristic Root Cause Generation (POST /api/problems/:id/root-causes/analyze)
 *   - Manual Root Cause Proposal with RBAC (POST /api/problems/:id/root-causes)
 *   - Multi-Cause Support with PRIMARY / CONTRIBUTING distinction
 *   - Concurrency-safe single PRIMARY cause enforcement
 *   - Deterministic, explainable confidence scoring (independent of verification status)
 *   - Link-based multi-evidence ledger (root_cause_evidence)
 *   - Verification lifecycle: PROPOSED -> UNDER_REVIEW -> VERIFIED / REJECTED (and REJECTED -> UNDER_REVIEW)
 *   - Sanitized user projection (no password_hash, email, phone)
 *   - Zero automatic problem status mutation
 */

"use strict";

const pool = require("../config/db");

// ---------------------------------------------------------------------------
// Custom Errors
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

class ConflictError extends Error {
    constructor(message) {
        super(message);
        this.name = "ConflictError";
    }
}

// ---------------------------------------------------------------------------
// Constants & Enums
// ---------------------------------------------------------------------------

const VALID_CATEGORIES = [
    "GENERAL",
    "INFRASTRUCTURE",
    "ENVIRONMENTAL",
    "OPERATIONAL",
    "POLICY_REGULATORY",
    "SOCIO_ECONOMIC",
    "TECHNICAL",
    "BIOLOGICAL_HEALTH",
];

const VALID_SOURCE_TYPES = [
    "AI",
    "RESEARCHER",
    "AUTHORITY",
    "STUDENT",
    "CITIZEN",
    "COMMUNITY",
    "OTHER",
];

const VALID_CAUSE_TYPES = ["PRIMARY", "CONTRIBUTING"];

const VALID_VERIFICATION_STATUSES = [
    "PROPOSED",
    "UNDER_REVIEW",
    "VERIFIED",
    "REJECTED",
];

const VERIFICATION_FLOW = {
    PROPOSED: ["UNDER_REVIEW"],
    UNDER_REVIEW: ["VERIFIED", "REJECTED"],
    REJECTED: ["UNDER_REVIEW"],
    VERIFIED: [], // Terminal
};

const VALID_EVIDENCE_TYPES = [
    "FIELD_OBSERVATION",
    "LAB_REPORT",
    "RESEARCH_CITATION",
    "GOVERNMENT_RECORD",
    "DATASET",
    "MEDIA_LINK",
    "COMMUNITY_REPORT",
];

// ---------------------------------------------------------------------------
// Validation Helpers
// ---------------------------------------------------------------------------

function isValidUrl(urlString) {
    if (!urlString || typeof urlString !== "string") return false;
    try {
        const parsed = new URL(urlString.trim());
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}

function sanitizeUser(userRow, idKey = "id", nameKey = "name", roleKey = "role") {
    if (!userRow || !userRow[idKey]) return null;
    return {
        id: userRow[idKey],
        name: userRow[nameKey] || "Unknown",
        role: userRow[roleKey] || "USER",
    };
}

// ---------------------------------------------------------------------------
// RBAC Permissions
// ---------------------------------------------------------------------------

function isAuthorityOrAdmin(user) {
    return Boolean(user && ["AUTHORITY", "ADMIN"].includes(user.role));
}

function canAnalyze(user) {
    if (!user) return false;
    return ["AUTHORITY", "ADMIN", "RESEARCHER", "UNIVERSITY"].includes(user.role);
}

/**
 * Check if a user is permitted to propose a root cause on this problem.
 * Enforces Fix 4 for students (using existing relationships, no invented tables).
 */
async function canPropose(user, problemId) {
    if (!user) return false;
    if (isAuthorityOrAdmin(user)) return true;
    if (["RESEARCHER", "UNIVERSITY"].includes(user.role)) return true;

    if (user.role === "STUDENT") {
        // Check 1: Student has skills in student_profiles matching problem.required_expertise
        const skillCheck = await pool.query(
            `SELECT 1 FROM student_profiles sp, problems p
             WHERE sp.user_id = $1 AND p.id = $2
               AND sp.skills IS NOT NULL
               AND p.required_expertise IS NOT NULL
               AND sp.skills && p.required_expertise
             LIMIT 1`,
            [user.id, problemId]
        );
        if (skillCheck.rows.length > 0) return true;

        // Check 2: Student is contributor or submitter on a solution for this problem
        const contribCheck = await pool.query(
            `SELECT 1 FROM solutions s
             LEFT JOIN solution_contributors sc ON sc.solution_id = s.id
             WHERE s.problem_id = $1 AND (s.submitted_by = $2 OR sc.user_id = $2)
             LIMIT 1`,
            [problemId, user.id]
        );
        if (contribCheck.rows.length > 0) return true;

        return false;
    }

    if (["STARTUP", "MSME"].includes(user.role)) {
        // Startup/MSME allowed if linked via solution/contributor
        const teamCheck = await pool.query(
            `SELECT 1 FROM solutions s
             LEFT JOIN solution_contributors sc ON sc.solution_id = s.id
             WHERE s.problem_id = $1 AND (s.submitted_by = $2 OR sc.user_id = $2)
             LIMIT 1`,
            [problemId, user.id]
        );
        return teamCheck.rows.length > 0;
    }

    // Citizens cannot propose formal root causes
    return false;
}

function canEdit(user, rootCause) {
    if (!user || !rootCause) return false;
    if (isAuthorityOrAdmin(user)) return true;

    // Proposers can only edit their own UNVERIFIED / PROPOSED / UNDER_REVIEW causes
    if (["VERIFIED", "REJECTED"].includes(rootCause.verification_status)) {
        return false;
    }

    return Number(rootCause.proposed_by) === Number(user.id);
}

function canAddEvidence(user, evidenceType) {
    if (!user) return false;
    if (user.role === "CITIZEN") {
        return ["FIELD_OBSERVATION", "COMMUNITY_REPORT", "MEDIA_LINK"].includes(evidenceType);
    }
    return true;
}

// ---------------------------------------------------------------------------
// Confidence Calculation (FIX 1: Strictly independent of verification status)
// ---------------------------------------------------------------------------

/**
 * Calculates deterministic confidence score.
 * Formula:
 *   confidence = clamp(base_score + evidence_boost, 0, 100)
 *
 * Verification status NEVER modifies confidence!
 */
function calculateCauseConfidence(baseScore, evidenceRows = []) {
    let boost = 0.0;
    for (const ev of evidenceRows) {
        const weight = Number(ev.confidence_weight) || 1.0;
        boost += weight * 5.0;
    }
    // Cap evidence boost at 25 points
    boost = Math.min(25.0, boost);

    const raw = Number(baseScore) + boost;
    return Number(Math.min(100.0, Math.max(0.0, raw)).toFixed(2));
}

// ---------------------------------------------------------------------------
// 1. AI ROOT CAUSE ANALYSIS ENGINE
// ---------------------------------------------------------------------------

/**
 * Domain-specific rule heuristics for deterministic root cause analysis.
 */
const DOMAIN_CAUSE_PATTERNS = {
    Water: [
        {
            cause: "Industrial effluent discharge upstream infiltrating groundwater aquifers",
            category: "ENVIRONMENTAL",
            keywords: ["chemical", "effluent", "factory", "borewell", "groundwater", "toxic", "turbidity", "industrial"],
            base_score: 78.0,
            reasoning: "Matched industrial contamination and groundwater infiltration indicators."
        },
        {
            cause: "Inadequate municipal wastewater drainage leading to shallow well contamination",
            category: "INFRASTRUCTURE",
            keywords: ["drainage", "sewage", "overflow", "well", "drinking water", "leak", "pipeline", "odor"],
            base_score: 72.0,
            reasoning: "Correlated with urban runoff and municipal drainage infrastructure defects."
        },
        {
            cause: "Excessive agricultural pesticide runoff during monsoon irrigation cycles",
            category: "ENVIRONMENTAL",
            keywords: ["agriculture", "pesticide", "fertilizer", "crop", "monsoon", "irrigation", "soil"],
            base_score: 65.0,
            reasoning: "Identified seasonal agrochemical leaching patterns."
        }
    ],
    Agriculture: [
        {
            cause: "Depletion of primary water table due to unregulated deep borewell extraction",
            category: "ENVIRONMENTAL",
            keywords: ["groundwater", "borewell", "water", "irrigation", "drought", "dry", "yield"],
            base_score: 76.0,
            reasoning: "Observed declining aquifer depth indicators in agricultural area."
        },
        {
            cause: "Soil nutrient degradation from continuous monocropping without restorative cover crops",
            category: "OPERATIONAL",
            keywords: ["soil", "fertility", "crop", "yield", "monoculture", "nutrient", "degradation"],
            base_score: 70.0,
            reasoning: "Agronomic pattern indicates systemic soil exhaustion."
        }
    ],
    Healthcare: [
        {
            cause: "Cross-contamination between broken sewage mains and municipal potable water supply",
            category: "INFRASTRUCTURE",
            keywords: ["cholera", "diarrhea", "illness", "water", "hospital", "outbreak", "infection"],
            base_score: 82.0,
            reasoning: "Epidemiological symptom pattern indicates waterborne bacterial transmission."
        }
    ],
    Environment: [
        {
            cause: "Uncontrolled open municipal waste burning emitting hazardous particulates",
            category: "ENVIRONMENTAL",
            keywords: ["smoke", "air", "burning", "waste", "garbage", "pollution", "smog"],
            base_score: 80.0,
            reasoning: "Atmospheric particulate density linked to open combustion sites."
        },
        {
            cause: "Industrial chemical and heavy metal leaching from unlined solid waste landfills",
            category: "ENVIRONMENTAL",
            keywords: ["waste", "landfill", "chemical", "groundwater", "leachate", "toxic", "soil", "water"],
            base_score: 75.0,
            reasoning: "Hydrogeological vulnerability indicates subterranean chemical migration from unlined landfill."
        },
        {
            cause: "Discharge of untreated storm sewer effluents into local natural surface water bodies",
            category: "INFRASTRUCTURE",
            keywords: ["water", "effluent", "drainage", "sewer", "contamination", "river", "lake", "stream"],
            base_score: 71.0,
            reasoning: "Surface runoff analysis indicates persistent untreated effluent discharge."
        }
    ],
    Infrastructure: [
        {
            cause: "Sub-base soil erosion beneath main carriageway due to unlined drainage culvert",
            category: "INFRASTRUCTURE",
            keywords: ["road", "pothole", "collapse", "culvert", "drainage", "foundation", "structural"],
            base_score: 74.0,
            reasoning: "Structural failure indicates hydraulic erosion beneath road foundation."
        }
    ]
};

async function analyzeRootCauses(problemId, user) {
    if (!canAnalyze(user)) {
        throw new ForbiddenError("You do not have permission to trigger AI root cause analysis");
    }

    const probRes = await pool.query(
        `SELECT id, title, description, category, subcategory, district, cluster_id, required_expertise
         FROM problems WHERE id = $1`,
        [problemId]
    );

    if (probRes.rows.length === 0) {
        throw new NotFoundError("Problem not found");
    }

    const problem = probRes.rows[0];
    const fullText = `${problem.title || ""} ${problem.description || ""} ${problem.category || ""} ${problem.subcategory || ""}`.toLowerCase();

    // Check cluster recurrence: how many problems are linked to this cluster?
    let clusterRecurrence = 1;
    if (problem.cluster_id) {
        const cRes = await pool.query(
            "SELECT COUNT(*)::int AS count FROM problems WHERE cluster_id = $1",
            [problem.cluster_id]
        );
        clusterRecurrence = Math.max(1, cRes.rows[0].count);
    }

    // Determine domain pattern candidates
    const domainKey = Object.keys(DOMAIN_CAUSE_PATTERNS).find(
        (k) => k.toLowerCase() === (problem.category || "").toLowerCase()
    ) || "Water";

    const patterns = DOMAIN_CAUSE_PATTERNS[domainKey] || DOMAIN_CAUSE_PATTERNS.Water;
    const generatedCauses = [];

    for (const pat of patterns) {
        // Count matched keywords
        const matchedKeywords = pat.keywords.filter((kw) => fullText.includes(kw.toLowerCase()));
        const matchRatio = matchedKeywords.length / Math.max(1, pat.keywords.length);

        // Calculate explainable confidence: base_score + keyword bonus + cluster bonus
        const keywordBonus = matchRatio * 15.0;
        const clusterBonus = Math.min(10.0, (clusterRecurrence - 1) * 3.0);
        const finalConfidence = Number(Math.min(95.0, pat.base_score + keywordBonus + clusterBonus).toFixed(2));

        const signals = {
            domain: domainKey,
            keyword_matches: matchedKeywords,
            match_ratio: Number(matchRatio.toFixed(2)),
            cluster_recurrence: clusterRecurrence,
            base_score: pat.base_score,
            keyword_bonus: Number(keywordBonus.toFixed(2)),
            cluster_bonus: Number(clusterBonus.toFixed(2)),
        };

        // Insert into database, handling duplicates gracefully via ON CONFLICT DO NOTHING
        const insertRes = await pool.query(
            `INSERT INTO root_causes
                (problem_id, cause, confidence, category, source_type, cause_type,
                 verification_status, reasoning, signals, verified)
             VALUES ($1, $2, $3, $4, 'AI', 'CONTRIBUTING', 'PROPOSED', $5, $6, FALSE)
             ON CONFLICT (problem_id, LOWER(TRIM(cause)))
             DO UPDATE SET
                confidence = EXCLUDED.confidence,
                signals = EXCLUDED.signals,
                reasoning = EXCLUDED.reasoning,
                updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [problemId, pat.cause, finalConfidence, pat.category, pat.reasoning, JSON.stringify(signals)]
        );

        if (insertRes.rows.length > 0) {
            generatedCauses.push(insertRes.rows[0]);
        }
    }

    return generatedCauses.map((r) => formatRootCause(r));
}

// ---------------------------------------------------------------------------
// 2. CREATE ROOT CAUSE (MANUAL PROPOSAL)
// ---------------------------------------------------------------------------

async function createRootCause({ problemId, user, payload }) {
    const probRes = await pool.query(
        "SELECT id, title, required_expertise FROM problems WHERE id = $1",
        [problemId]
    );
    if (probRes.rows.length === 0) {
        throw new NotFoundError("Problem not found");
    }

    const authorized = await canPropose(user, problemId);
    if (!authorized) {
        throw new ForbiddenError("You are not authorized to propose a root cause for this problem");
    }

    if (!payload || typeof payload !== "object") {
        throw new ValidationError("Payload must be an object");
    }

    if (!payload.cause || typeof payload.cause !== "string" || !payload.cause.trim() || payload.cause.trim().length < 3) {
        throw new ValidationError('"cause" is required and must be at least 3 characters');
    }

    const causeText = payload.cause.trim();
    const category = payload.category ? String(payload.category).trim().toUpperCase() : "GENERAL";
    if (!VALID_CATEGORIES.includes(category)) {
        throw new ValidationError(`"category" must be one of: ${VALID_CATEGORIES.join(", ")}`);
    }

    const causeType = payload.cause_type ? String(payload.cause_type).trim().toUpperCase() : "CONTRIBUTING";
    if (!VALID_CAUSE_TYPES.includes(causeType)) {
        throw new ValidationError(`"cause_type" must be one of: ${VALID_CAUSE_TYPES.join(", ")}`);
    }

    // FIX 3: Only AUTHORITY / ADMIN can designate a cause as PRIMARY
    if (causeType === "PRIMARY") {
        if (!isAuthorityOrAdmin(user)) {
            throw new ForbiddenError("Only authorities and administrators can designate a root cause as PRIMARY");
        }

        // Concurrency check in service layer
        const primaryCheck = await pool.query(
            "SELECT id FROM root_causes WHERE problem_id = $1 AND cause_type = 'PRIMARY'",
            [problemId]
        );
        if (primaryCheck.rows.length > 0) {
            throw new ConflictError("A PRIMARY root cause already exists for this problem");
        }
    }

    // Determine initial confidence
    let confidence = 50.0;
    if (payload.confidence !== undefined && payload.confidence !== null) {
        const num = Number(payload.confidence);
        if (isNaN(num) || num < 0 || num > 100) {
            throw new ValidationError('"confidence" must be a number between 0 and 100');
        }
        confidence = Number(num.toFixed(2));
    }

    const sourceType = isAuthorityOrAdmin(user)
        ? "AUTHORITY"
        : user.role === "STUDENT"
        ? "STUDENT"
        : user.role === "RESEARCHER" || user.role === "UNIVERSITY"
        ? "RESEARCHER"
        : "HUMAN";

    const reasoning = payload.reasoning ? payload.reasoning.trim() : `Hypothesis proposed by ${user.role}`;

    const signals = {
        base_score: confidence,
        ...(payload.signals || {}),
    };

    try {
        const res = await pool.query(
            `INSERT INTO root_causes
                (problem_id, proposed_by, cause, confidence, category, source_type,
                 cause_type, verification_status, reasoning, signals, verified)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'PROPOSED', $8, $9, FALSE)
             RETURNING *`,
            [
                problemId,
                user.id,
                causeText,
                confidence,
                category,
                sourceType,
                causeType,
                reasoning,
                JSON.stringify(signals),
            ]
        );

        return formatRootCause(res.rows[0], user);
    } catch (err) {
        // Catch expression-based unique index / partial unique index violations
        if (err.code === "23505") {
            if (err.constraint === "uq_problem_primary_cause") {
                throw new ConflictError("A PRIMARY root cause already exists for this problem");
            }
            throw new ConflictError("This root cause has already been proposed for this problem");
        }
        throw err;
    }
}

// ---------------------------------------------------------------------------
// 3. GET ROOT CAUSES FOR PROBLEM
// ---------------------------------------------------------------------------

async function getProblemRootCauses(problemId) {
    const probCheck = await pool.query("SELECT id FROM problems WHERE id = $1", [problemId]);
    if (probCheck.rows.length === 0) {
        throw new NotFoundError("Problem not found");
    }

    const res = await pool.query(
        `SELECT rc.*,
                pu.name AS proposer_name, pu.role AS proposer_role,
                vu.name AS verifier_name, vu.role AS verifier_role,
                COALESCE(COUNT(rce.id), 0)::int AS evidence_count
         FROM root_causes rc
         LEFT JOIN users pu ON pu.id = rc.proposed_by
         LEFT JOIN users vu ON vu.id = rc.verified_by
         LEFT JOIN root_cause_evidence rce ON rce.root_cause_id = rc.id
         WHERE rc.problem_id = $1
         GROUP BY rc.id, pu.name, pu.role, vu.name, vu.role
         ORDER BY (rc.cause_type = 'PRIMARY') DESC, rc.confidence DESC, rc.created_at DESC`,
        [problemId]
    );

    return res.rows.map((r) => formatRootCause(r));
}

// ---------------------------------------------------------------------------
// 4. GET ROOT CAUSE BY ID
// ---------------------------------------------------------------------------

async function getRootCauseById(id) {
    const res = await pool.query(
        `SELECT rc.*,
                pu.name AS proposer_name, pu.role AS proposer_role,
                vu.name AS verifier_name, vu.role AS verifier_role
         FROM root_causes rc
         LEFT JOIN users pu ON pu.id = rc.proposed_by
         LEFT JOIN users vu ON vu.id = rc.verified_by
         WHERE rc.id = $1`,
        [id]
    );

    if (res.rows.length === 0) {
        throw new NotFoundError("Root cause not found");
    }

    const evidenceRes = await pool.query(
        `SELECT rce.*, u.name AS submitter_name, u.role AS submitter_role
         FROM root_cause_evidence rce
         LEFT JOIN users u ON u.id = rce.submitted_by
         WHERE rce.root_cause_id = $1
         ORDER BY rce.created_at DESC`,
        [id]
    );

    return {
        ...formatRootCause(res.rows[0]),
        evidence: evidenceRes.rows.map(formatEvidence),
    };
}

// ---------------------------------------------------------------------------
// 5. UPDATE ROOT CAUSE
// ---------------------------------------------------------------------------

async function updateRootCause({ id, user, payload }) {
    const rcRes = await pool.query("SELECT * FROM root_causes WHERE id = $1", [id]);
    if (rcRes.rows.length === 0) {
        throw new NotFoundError("Root cause not found");
    }

    const current = rcRes.rows[0];

    if (!canEdit(user, current)) {
        throw new ForbiddenError("You are not authorized to edit this root cause");
    }

    if (!payload || typeof payload !== "object") {
        throw new ValidationError("Payload must be an object");
    }

    let causeText = current.cause;
    if (payload.cause !== undefined) {
        if (typeof payload.cause !== "string" || !payload.cause.trim() || payload.cause.trim().length < 3) {
            throw new ValidationError('"cause" must be at least 3 characters');
        }
        causeText = payload.cause.trim();
    }

    let category = current.category;
    if (payload.category !== undefined) {
        const cat = String(payload.category).trim().toUpperCase();
        if (!VALID_CATEGORIES.includes(cat)) {
            throw new ValidationError(`"category" must be one of: ${VALID_CATEGORIES.join(", ")}`);
        }
        category = cat;
    }

    let causeType = current.cause_type;
    if (payload.cause_type !== undefined) {
        const ct = String(payload.cause_type).trim().toUpperCase();
        if (!VALID_CAUSE_TYPES.includes(ct)) {
            throw new ValidationError(`"cause_type" must be one of: ${VALID_CAUSE_TYPES.join(", ")}`);
        }
        if (ct === "PRIMARY" && current.cause_type !== "PRIMARY") {
            if (!isAuthorityOrAdmin(user)) {
                throw new ForbiddenError("Only authorities and administrators can designate a root cause as PRIMARY");
            }
            const primaryCheck = await pool.query(
                "SELECT id FROM root_causes WHERE problem_id = $1 AND cause_type = 'PRIMARY' AND id != $2",
                [current.problem_id, id]
            );
            if (primaryCheck.rows.length > 0) {
                throw new ConflictError("A PRIMARY root cause already exists for this problem");
            }
        }
        causeType = ct;
    }

    let reasoning = current.reasoning;
    if (payload.reasoning !== undefined) {
        reasoning = payload.reasoning ? payload.reasoning.trim() : null;
    }

    try {
        const updateRes = await pool.query(
            `UPDATE root_causes
             SET cause = $1,
                 category = $2,
                 cause_type = $3,
                 reasoning = $4,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5
             RETURNING *`,
            [causeText, category, causeType, reasoning, id]
        );

        return formatRootCause(updateRes.rows[0]);
    } catch (err) {
        if (err.code === "23505") {
            if (err.constraint === "uq_problem_primary_cause") {
                throw new ConflictError("A PRIMARY root cause already exists for this problem");
            }
            throw new ConflictError("This root cause text already exists for this problem");
        }
        throw err;
    }
}

// ---------------------------------------------------------------------------
// 6. ATTACH EVIDENCE (LINK-BASED LEDGER)
// ---------------------------------------------------------------------------

async function addEvidence({ rootCauseId, user, payload }) {
    const rcRes = await pool.query("SELECT * FROM root_causes WHERE id = $1", [rootCauseId]);
    if (rcRes.rows.length === 0) {
        throw new NotFoundError("Root cause not found");
    }

    if (!payload || typeof payload !== "object") {
        throw new ValidationError("Payload must be an object");
    }

    if (!payload.title || typeof payload.title !== "string" || !payload.title.trim()) {
        throw new ValidationError('"title" is required');
    }

    if (!payload.evidence_url || !isValidUrl(payload.evidence_url)) {
        throw new ValidationError('"evidence_url" must be a valid HTTP or HTTPS URL');
    }

    const evidenceType = payload.evidence_type ? String(payload.evidence_type).trim().toUpperCase() : "FIELD_OBSERVATION";
    if (!VALID_EVIDENCE_TYPES.includes(evidenceType)) {
        throw new ValidationError(`"evidence_type" must be one of: ${VALID_EVIDENCE_TYPES.join(", ")}`);
    }

    if (!canAddEvidence(user, evidenceType)) {
        throw new ForbiddenError(`Citizens can only submit field observations, community reports, or media links`);
    }

    let confidenceWeight = 1.0;
    if (payload.confidence_weight !== undefined && payload.confidence_weight !== null) {
        const w = Number(payload.confidence_weight);
        if (isNaN(w) || w < 0.1 || w > 2.0) {
            throw new ValidationError('"confidence_weight" must be between 0.10 and 2.00');
        }
        confidenceWeight = Number(w.toFixed(2));
    }

    const insertRes = await pool.query(
        `INSERT INTO root_cause_evidence
            (root_cause_id, submitted_by, evidence_type, title, description, evidence_url, confidence_weight)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
            rootCauseId,
            user.id,
            evidenceType,
            payload.title.trim(),
            payload.description ? payload.description.trim() : null,
            payload.evidence_url.trim(),
            confidenceWeight,
        ]
    );

    // FIX 1: Deterministically recalculate confidence based on evidence signals
    const allEvidence = await pool.query(
        "SELECT confidence_weight FROM root_cause_evidence WHERE root_cause_id = $1",
        [rootCauseId]
    );

    const baseScore = rcRes.rows[0].signals?.base_score !== undefined
        ? Number(rcRes.rows[0].signals.base_score)
        : (Number(rcRes.rows[0].confidence) || 50.0);
    const newConfidence = calculateCauseConfidence(baseScore, allEvidence.rows);

    await pool.query(
        "UPDATE root_causes SET confidence = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [newConfidence, rootCauseId]
    );

    return formatEvidence({
        ...insertRes.rows[0],
        submitter_name: user.name,
        submitter_role: user.role,
    });
}

async function getRootCauseEvidence(rootCauseId) {
    const rcRes = await pool.query("SELECT id FROM root_causes WHERE id = $1", [rootCauseId]);
    if (rcRes.rows.length === 0) {
        throw new NotFoundError("Root cause not found");
    }

    const res = await pool.query(
        `SELECT rce.*, u.name AS submitter_name, u.role AS submitter_role
         FROM root_cause_evidence rce
         LEFT JOIN users u ON u.id = rce.submitted_by
         WHERE rce.root_cause_id = $1
         ORDER BY rce.created_at DESC`,
        [rootCauseId]
    );

    return res.rows.map(formatEvidence);
}

// ---------------------------------------------------------------------------
// 7. VERIFICATION LIFECYCLE (FIX 1: Strictly isolated from confidence score)
// ---------------------------------------------------------------------------

async function verifyRootCause({ id, user, payload }) {
    if (!isAuthorityOrAdmin(user)) {
        throw new ForbiddenError("Only authorities and administrators can verify or reject root causes");
    }

    if (!payload || !payload.verification_status) {
        throw new ValidationError('"verification_status" is required');
    }

    const newStatus = String(payload.verification_status).trim().toUpperCase();
    if (!VALID_VERIFICATION_STATUSES.includes(newStatus)) {
        throw new ValidationError(`"verification_status" must be one of: ${VALID_VERIFICATION_STATUSES.join(", ")}`);
    }

    const rcRes = await pool.query("SELECT * FROM root_causes WHERE id = $1", [id]);
    if (rcRes.rows.length === 0) {
        throw new NotFoundError("Root cause not found");
    }

    const current = rcRes.rows[0];
    const allowedNext = VERIFICATION_FLOW[current.verification_status] || [];

    if (!allowedNext.includes(newStatus)) {
        throw new ValidationError(
            `Invalid verification transition from "${current.verification_status}" to "${newStatus}". Allowed: ${
                allowedNext.length > 0 ? allowedNext.join(", ") : "None (terminal)"
            }`
        );
    }

    if (["VERIFIED", "REJECTED"].includes(newStatus)) {
        if (!payload.verification_notes || typeof payload.verification_notes !== "string" || payload.verification_notes.trim().length < 5) {
            throw new ValidationError('"verification_notes" are required (minimum 5 characters) when verifying or rejecting');
        }
    }

    const verifiedBool = newStatus === "VERIFIED";

    const updateRes = await pool.query(
        `UPDATE root_causes
         SET verification_status = $1,
             verified = $2,
             verified_by = $3,
             verified_at = CURRENT_TIMESTAMP,
             verification_notes = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [newStatus, verifiedBool, user.id, payload.verification_notes ? payload.verification_notes.trim() : null, id]
    );

    // CRITICAL (FIX 1): DO NOT alter confidence based on verification status!
    // CRITICAL: DO NOT alter problems.status!

    return formatRootCause({
        ...updateRes.rows[0],
        verifier_name: user.name,
        verifier_role: user.role,
    });
}

// ---------------------------------------------------------------------------
// 8. PROBLEM ROOT CAUSE SUMMARY
// ---------------------------------------------------------------------------

async function getProblemRootCausesSummary(problemId) {
    const probRes = await pool.query(
        "SELECT id, title, status, category, district FROM problems WHERE id = $1",
        [problemId]
    );
    if (probRes.rows.length === 0) {
        throw new NotFoundError("Problem not found");
    }

    const problem = probRes.rows[0];

    const causes = await getProblemRootCauses(problemId);

    const primaryCause = causes.find((c) => c.cause_type === "PRIMARY") || null;
    const verifiedCount = causes.filter((c) => c.verification_status === "VERIFIED").length;
    const underReviewCount = causes.filter((c) => c.verification_status === "UNDER_REVIEW").length;
    const rejectedCount = causes.filter((c) => c.verification_status === "REJECTED").length;
    const proposedCount = causes.filter((c) => c.verification_status === "PROPOSED").length;

    const categoriesBreakdown = {};
    for (const c of causes) {
        categoriesBreakdown[c.category] = (categoriesBreakdown[c.category] || 0) + 1;
    }

    return {
        problem_id: problem.id,
        problem_title: problem.title,
        problem_status: problem.status,
        total_causes: causes.length,
        verified_causes: verifiedCount,
        under_review_causes: underReviewCount,
        rejected_causes: rejectedCount,
        proposed_causes: proposedCount,
        primary_cause: primaryCause,
        categories_breakdown: categoriesBreakdown,
        causes,
    };
}

// ---------------------------------------------------------------------------
// Formatter Helpers
// ---------------------------------------------------------------------------

function formatRootCause(row, proposerObj = null) {
    if (!row) return null;
    const safeProposerObj = (proposerObj && typeof proposerObj === "object") ? proposerObj : null;
    const verificationStatus = (row.verified === true && (row.verification_status === "PROPOSED" || !row.verification_status))
        ? "VERIFIED"
        : (row.verification_status || "PROPOSED");

    const proposer = safeProposerObj
        ? { id: safeProposerObj.id, name: safeProposerObj.name, role: safeProposerObj.role }
        : row.proposer_name
        ? { id: row.proposed_by, name: row.proposer_name, role: row.proposer_role }
        : null;

    return {
        id: row.id,
        problem_id: row.problem_id,
        cause: row.cause,
        category: row.category,
        cause_type: row.cause_type,
        source_type: row.source_type,
        confidence: Number(row.confidence),
        verification_status: verificationStatus,
        verified: Boolean(row.verified || verificationStatus === "VERIFIED"),
        verified_by: row.verified_by,
        verified_at: row.verified_at,
        verification_notes: row.verification_notes,
        reasoning: row.reasoning,
        signals: row.signals,
        created_at: row.created_at,
        updated_at: row.updated_at,
        evidence_count: row.evidence_count !== undefined ? Number(row.evidence_count) : undefined,
        proposer: proposer,
        proposed_by: row.proposed_by,
        verifier: row.verifier_name
            ? { id: row.verified_by, name: row.verifier_name, role: row.verifier_role }
            : row.verified_by
            ? { id: row.verified_by }
            : null,
    };
}

function formatEvidence(row) {
    if (!row) return null;
    return {
        id: row.id,
        root_cause_id: row.root_cause_id,
        evidence_type: row.evidence_type,
        title: row.title,
        description: row.description,
        evidence_url: row.evidence_url,
        confidence_weight: Number(row.confidence_weight),
        created_at: row.created_at,
        submitted_by: row.submitter_name
            ? { id: row.submitted_by, name: row.submitter_name, role: row.submitter_role }
            : { id: row.submitted_by },
    };
}

module.exports = {
    ValidationError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    VALID_CATEGORIES,
    VALID_SOURCE_TYPES,
    VALID_CAUSE_TYPES,
    VALID_VERIFICATION_STATUSES,
    VERIFICATION_FLOW,
    VALID_EVIDENCE_TYPES,
    isAuthorityOrAdmin,
    canAnalyze,
    canPropose,
    canEdit,
    canAddEvidence,
    calculateCauseConfidence,
    analyzeRootCauses,
    createRootCause,
    getProblemRootCauses,
    getRootCauseById,
    updateRootCause,
    addEvidence,
    getRootCauseEvidence,
    verifyRootCause,
    getProblemRootCausesSummary,
};
