const { Pool } = require("pg");
require("dotenv").config();

const pgPool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "civicsync",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    connectionTimeoutMillis: 1500,
});

let isPgAvailable = null;

const DEMO_HASH = "$2b$10$/oJj4fE6zX.LA4yK.rw9IO5rsASnVRfZAkMrxkYXXFbZvK.WrexFC"; // Verified hash for "CivicSync2026!"

// In-Memory Database Store Fallback (active when PostgreSQL port 5432 is not running)
const memoryDB = {
    problems: [
        {
            id: "prob-042",
            reporter_id: 1,
            title: "Yellow contaminated handpump water in Ward 4 village",
            description: "The water coming out of handpumps has turned metallic yellow and has a high iron/salinity smell. Residents are facing health issues.",
            category: "Water & Sanitation",
            subcategory: "Groundwater Quality",
            district: "Dhanbad",
            city: "Govindpur Block",
            address: "Ward 4, Near Panchayat Bhawan, Barmasia",
            affected_people: 1250,
            ai_summary: "High urgency groundwater quality challenge affecting drinking supply in Dhanbad.",
            ai_keywords: ["Handpump", "Water Quality", "Iron Contamination", "Sanitation"],
            required_expertise: ["Water Quality Testing", "Hydrogeology", "Environmental Engineering"],
            severity: 9,
            urgency: 10,
            ai_confidence: 0.95,
            priority_score: 95,
            status: "REPORTED",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    ],
    challenges: [],
    challenge_dossiers: [],
    users: [
        { id: 1, name: "Ramesh Citizen", email: "citizen@civicsync.demo", phone: "9876543210", password_hash: DEMO_HASH, role: "CITIZEN", is_active: true, created_at: new Date().toISOString() },
        { id: 2, name: "Arjun Sharma", email: "student@civicsync.demo", phone: "9876543211", password_hash: DEMO_HASH, role: "STUDENT", is_active: true, created_at: new Date().toISOString() },
        { id: 3, name: "Dr. Sunita Rao", email: "researcher@civicsync.demo", phone: "9876543212", password_hash: DEMO_HASH, role: "RESEARCHER", is_active: true, created_at: new Date().toISOString() },
        { id: 4, name: "AquaTech Solutions", email: "startup@civicsync.demo", phone: "9876543213", password_hash: DEMO_HASH, role: "STARTUP", is_active: true, created_at: new Date().toISOString() },
        { id: 5, name: "EcoFilter Works", email: "msme@civicsync.demo", phone: "9876543214", password_hash: DEMO_HASH, role: "MSME", is_active: true, created_at: new Date().toISOString() },
        { id: 6, name: "IIT (ISM) Dhanbad", email: "university@civicsync.demo", phone: "9876543215", password_hash: DEMO_HASH, role: "UNIVERSITY", is_active: true, created_at: new Date().toISOString() },
        { id: 7, name: "Dhanbad DM Office", email: "authority@civicsync.demo", phone: "9876543216", password_hash: DEMO_HASH, role: "AUTHORITY", is_active: true, created_at: new Date().toISOString() },
        { id: 8, name: "Platform Admin", email: "admin@civicsync.demo", phone: "9876543217", password_hash: DEMO_HASH, role: "ADMIN", is_active: true, created_at: new Date().toISOString() },
        { id: 9, name: "Citizen Reporter", email: "citizen@example.com", phone: "9876543218", password_hash: DEMO_HASH, role: "CITIZEN", is_active: true, created_at: new Date().toISOString() }
    ]
};

let problemCounter = 100;
let challengeCounter = 100;
let dossierCounter = 100;
let userCounter = 10;

async function executeQuery(text, params = []) {
    if (isPgAvailable !== false) {
        try {
            const res = await pgPool.query(text, params);
            isPgAvailable = true;
            return res;
        } catch (err) {
            if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND" || (err.message && err.message.includes("connect"))) {
                if (isPgAvailable === null) {
                    console.warn("⚠️ PostgreSQL 5432 not reachable. Activating resilient in-memory database store.");
                }
                isPgAvailable = false;
            } else {
                throw err;
            }
        }
    }

    // In-memory SQL engine simulation
    const trimmed = (text || "").trim();
    const upperText = trimmed.toUpperCase();

    // 0. USER QUERY HANDLERS
    if (upperText.startsWith("INSERT INTO USERS")) {
        const id = userCounter++;
        const newUser = {
            id,
            name: params[0],
            email: (params[1] || "").toLowerCase().trim(),
            phone: params[2] || null,
            password_hash: params[3],
            role: params[4] || "CITIZEN",
            is_active: true,
            is_email_verified: true,
            is_phone_verified: false,
            created_at: new Date().toISOString()
        };
        memoryDB.users.push(newUser);
        return { rows: [newUser], rowCount: 1 };
    }

    if (upperText.includes("FROM USERS")) {
        let list = [...memoryDB.users];

        if (upperText.includes("WHERE EMAIL = $1") || upperText.includes("WHERE EMAIL = $1 AND IS_ACTIVE = TRUE")) {
            const searchEmail = (params[0] || "").toLowerCase().trim();
            const found = list.find(u => u.email.toLowerCase() === searchEmail && u.is_active);
            return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
        }

        if (upperText.includes("WHERE ID = $1")) {
            const searchId = Number(params[0]);
            const found = list.find(u => u.id === searchId);
            return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
        }

        return { rows: list, rowCount: list.length };
    }

    // 1. INSERT INTO problems
    if (upperText.startsWith("INSERT INTO PROBLEMS")) {
        const id = `prob-${problemCounter++}`;
        const now = new Date().toISOString();

        let reporter_id = 1;
        let title = "Untitled Problem";
        let description = "";
        let category = "General";
        let subcategory = "General";
        let district = null;
        let city = null;
        let address = null;
        let affected_people = 0;
        let ai_summary = "";
        let ai_keywords = [];
        let required_expertise = [];
        let severity = 5;
        let urgency = 5;
        let ai_confidence = 0.9;
        let priority_score = 75;

        if (params.length === 14) {
            reporter_id = params[0];
            title = params[1] || title;
            description = params[2] || description;
            category = params[3] || category;
            subcategory = params[4] || subcategory;
            district = params[5] || district;
            affected_people = params[6] || affected_people;
            ai_summary = params[7] || ai_summary;
            ai_keywords = params[8] || ai_keywords;
            required_expertise = params[9] || required_expertise;
            severity = params[10] || severity;
            urgency = params[11] || urgency;
            ai_confidence = params[12] || ai_confidence;
            priority_score = params[13] || priority_score;
        } else if (params.length >= 20) {
            reporter_id = params[0];
            title = params[1] || title;
            description = params[2] || description;
            category = params[3] || category;
            subcategory = params[4] || subcategory;
            district = params[5] || district;
            city = params[6] || city;
            address = params[7] || address;
            affected_people = params[12] || affected_people;
            ai_summary = params[13] || ai_summary;
            ai_keywords = params[14] || ai_keywords;
            required_expertise = params[15] || required_expertise;
            severity = params[16] || severity;
            urgency = params[17] || urgency;
            ai_confidence = params[18] || ai_confidence;
            priority_score = params[19] || priority_score;
        } else {
            title = params[0] || title;
            description = params[1] || description;
        }

        const newProblem = {
            id,
            reporter_id,
            title,
            description,
            category,
            subcategory,
            district,
            city,
            address,
            affected_people: Number(affected_people) || 0,
            ai_summary,
            ai_keywords: Array.isArray(ai_keywords) ? ai_keywords : [],
            required_expertise: Array.isArray(required_expertise) ? required_expertise : [],
            severity: Number(severity) || 5,
            urgency: Number(urgency) || 5,
            ai_confidence: Number(ai_confidence) || 0.9,
            priority_score: Number(priority_score) || 75,
            status: "REPORTED",
            created_at: now,
            updated_at: now
        };

        memoryDB.problems.unshift(newProblem);
        return { rows: [newProblem], rowCount: 1 };
    }

    // 2. INSERT INTO challenges
    if (upperText.startsWith("INSERT INTO CHALLENGES")) {
        const id = `chal-${challengeCounter++}`;
        const newChal = {
            id,
            title: params[0],
            description: params[1],
            district: params[2],
            affected_people: params[3],
            domain: params[4],
            subdomain: params[5],
            problem_type: params[6],
            summary: params[7],
            severity: params[8],
            urgency: params[9],
            ai_confidence: params[10],
            created_at: new Date().toISOString()
        };
        memoryDB.challenges.unshift(newChal);
        return { rows: [newChal], rowCount: 1 };
    }

    // 3. INSERT INTO challenge_dossiers
    if (upperText.startsWith("INSERT INTO CHALLENGE_DOSSIERS")) {
        const id = `dos-${dossierCounter++}`;
        const newDossier = {
            id,
            problem_id: params[0],
            domain: params[1],
            subdomain: params[2],
            problem_type: params[3],
            summary: params[4],
            severity: params[5],
            urgency_label: params[6],
            urgency_score: params[7],
            dossier_data: typeof params[8] === "string" ? JSON.parse(params[8]) : params[8],
            overall_confidence: params[9],
            requires_human_review: params[10],
            created_at: new Date().toISOString()
        };
        memoryDB.challenge_dossiers.unshift(newDossier);

        // Also attach dossier to corresponding problem object in memoryDB
        const targetProb = memoryDB.problems.find(p => String(p.id) === String(params[0]));
        if (targetProb) {
            targetProb.dossier = newDossier.dossier_data;
        }

        return { rows: [newDossier], rowCount: 1 };
    }

    // 4. SELECT FROM problems
    if (upperText.includes("FROM PROBLEMS")) {
        let list = [...memoryDB.problems];

        if (upperText.includes("WHERE ID = $1") || upperText.includes("WHERE P.ID = $1")) {
            const targetId = String(params[0]);
            const found = list.find(p => String(p.id) === targetId);
            return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
        }

        if (upperText.includes("REPORTER_ID = $1")) {
            const userId = Number(params[0]);
            list = list.filter(p => Number(p.reporter_id) === userId);
        }

        list = list.map(p => ({
            ...p,
            reporter_name: memoryDB.users.find(u => u.id === p.reporter_id)?.name || "Citizen Reporter"
        }));

        return { rows: list, rowCount: list.length };
    }

    return { rows: [], rowCount: 0 };
}

const dbWrapper = {
    query: (text, params) => executeQuery(text, params),
    on: (event, handler) => {
        pgPool.on(event, handler);
    },
    end: () => pgPool.end()
};

module.exports = dbWrapper;