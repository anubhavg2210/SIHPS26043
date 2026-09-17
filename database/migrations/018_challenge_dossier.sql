-- Migration 018: Actionable Challenge Dossier persistence
-- Extends the schema to store structured AI & human-reviewed Challenge Dossiers

CREATE TABLE IF NOT EXISTS challenge_dossiers (
    id SERIAL PRIMARY KEY,
    problem_id INTEGER REFERENCES problems(id) ON DELETE CASCADE,
    domain VARCHAR(100) NOT NULL,
    subdomain VARCHAR(100) NOT NULL,
    problem_type VARCHAR(150) NOT NULL,
    summary TEXT NOT NULL,
    severity INTEGER CHECK (severity BETWEEN 1 AND 10),
    urgency_label VARCHAR(20) DEFAULT 'Medium',
    urgency_score INTEGER CHECK (urgency_score BETWEEN 1 AND 10),
    dossier_data JSONB NOT NULL,
    overall_confidence NUMERIC(3,2) DEFAULT 0.80,
    requires_human_review BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cause_hypotheses (
    id SERIAL PRIMARY KEY,
    dossier_id INTEGER REFERENCES challenge_dossiers(id) ON DELETE CASCADE,
    cause_name TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'hypothesis', -- 'hypothesis', 'confirmed', 'rejected'
    reason TEXT,
    verification_needed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS verification_tasks (
    id SERIAL PRIMARY KEY,
    dossier_id INTEGER REFERENCES challenge_dossiers(id) ON DELETE CASCADE,
    task_description TEXT NOT NULL,
    evidence_type VARCHAR(100),
    verification_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'verified', 'failed'
    verified_by_user_id INTEGER,
    evidence_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dossier_work_packages (
    id SERIAL PRIMARY KEY,
    dossier_id INTEGER REFERENCES challenge_dossiers(id) ON DELETE CASCADE,
    wp_code VARCHAR(20) NOT NULL,
    name VARCHAR(200) NOT NULL,
    objective TEXT,
    status VARCHAR(50) DEFAULT 'planned', -- 'planned', 'active', 'completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_challenge_dossiers_problem_id ON challenge_dossiers(problem_id);
CREATE INDEX IF NOT EXISTS idx_challenge_dossiers_domain ON challenge_dossiers(domain, subdomain);
