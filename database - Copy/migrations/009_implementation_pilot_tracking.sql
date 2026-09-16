-- Migration 009: Implementation + Pilot Tracking
--
-- Creates tables for tracking the real-world deployment, milestones,
-- field updates, evidence, and blockers for approved solutions.
--
-- Safe to run multiple times (uses IF NOT EXISTS).

-- 1. Main Pilot / Implementation Project
CREATE TABLE IF NOT EXISTS solution_implementations (
    id                      SERIAL PRIMARY KEY,
    solution_id             INTEGER NOT NULL UNIQUE
                                REFERENCES solutions(id) ON DELETE CASCADE,
    problem_id              INTEGER NOT NULL
                                REFERENCES problems(id) ON DELETE CASCADE,
    lead_authority_id       INTEGER NOT NULL
                                REFERENCES users(id) ON DELETE RESTRICT,
    executing_user_id       INTEGER
                                REFERENCES users(id) ON DELETE SET NULL,

    title                   VARCHAR(255) NOT NULL,
    description             TEXT,
    status                  VARCHAR(30) NOT NULL DEFAULT 'PILOT'
                                CHECK (status IN ('PILOT', 'IMPLEMENTING', 'COMPLETED', 'PAUSED', 'BLOCKED', 'TERMINATED')),
    progress_percentage     INTEGER NOT NULL DEFAULT 0
                                CHECK (progress_percentage BETWEEN 0 AND 100),

    target_start_date       DATE NOT NULL,
    actual_start_date       DATE,
    target_end_date         DATE NOT NULL,
    actual_end_date         DATE,

    budget_allocated        NUMERIC(12, 2) DEFAULT 0.00,
    budget_spent            NUMERIC(12, 2) DEFAULT 0.00,
    location_details        TEXT,
    outcome_metrics         JSONB DEFAULT '{}',

    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_implementation_dates
        CHECK (target_end_date >= target_start_date)
);

-- 2. Implementation Milestones
CREATE TABLE IF NOT EXISTS implementation_milestones (
    id                      SERIAL PRIMARY KEY,
    implementation_id       INTEGER NOT NULL
                                REFERENCES solution_implementations(id) ON DELETE CASCADE,
    title                   VARCHAR(255) NOT NULL,
    description             TEXT,
    target_date             DATE,
    completion_date         DATE,
    status                  VARCHAR(30) NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED')),
    weight                  INTEGER NOT NULL DEFAULT 1 CHECK (weight > 0),
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Implementation Updates / Field Notes Log
CREATE TABLE IF NOT EXISTS implementation_updates (
    id                      SERIAL PRIMARY KEY,
    implementation_id       INTEGER NOT NULL
                                REFERENCES solution_implementations(id) ON DELETE CASCADE,
    user_id                 INTEGER NOT NULL
                                REFERENCES users(id) ON DELETE RESTRICT,
    update_type             VARCHAR(30) NOT NULL DEFAULT 'PROGRESS_NOTE'
                                CHECK (update_type IN ('PROGRESS_NOTE', 'MILESTONE_REACHED', 'METRIC_UPDATE', 'STATUS_CHANGE', 'BLOCKER_LOG')),
    content                 TEXT NOT NULL,
    progress_snapshot       INTEGER CHECK (progress_snapshot BETWEEN 0 AND 100),
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Implementation Evidence (Lab tests, photos, inspection certs)
CREATE TABLE IF NOT EXISTS implementation_evidence (
    id                      SERIAL PRIMARY KEY,
    implementation_id       INTEGER NOT NULL
                                REFERENCES solution_implementations(id) ON DELETE CASCADE,
    milestone_id            INTEGER
                                REFERENCES implementation_milestones(id) ON DELETE SET NULL,
    uploaded_by             INTEGER NOT NULL
                                REFERENCES users(id) ON DELETE RESTRICT,
    title                   VARCHAR(255) NOT NULL,
    evidence_type           VARCHAR(50) NOT NULL
                                CHECK (evidence_type IN ('PHOTO', 'LAB_REPORT', 'DOCUMENT', 'METRIC_DATA', 'CERTIFICATE', 'OTHER')),
    file_url                TEXT NOT NULL,
    description             TEXT,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Implementation Blockers / Issues
CREATE TABLE IF NOT EXISTS implementation_blockers (
    id                      SERIAL PRIMARY KEY,
    implementation_id       INTEGER NOT NULL
                                REFERENCES solution_implementations(id) ON DELETE CASCADE,
    raised_by               INTEGER NOT NULL
                                REFERENCES users(id) ON DELETE RESTRICT,
    title                   VARCHAR(255) NOT NULL,
    description             TEXT NOT NULL,
    severity                VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
                                CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status                  VARCHAR(20) NOT NULL DEFAULT 'OPEN'
                                CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
    resolution_notes        TEXT,
    resolved_at             TIMESTAMP,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_impl_solution_id ON solution_implementations(solution_id);
CREATE INDEX IF NOT EXISTS idx_impl_problem_id ON solution_implementations(problem_id);
CREATE INDEX IF NOT EXISTS idx_impl_milestones_impl_id ON implementation_milestones(implementation_id);
CREATE INDEX IF NOT EXISTS idx_impl_updates_impl_id ON implementation_updates(implementation_id);
CREATE INDEX IF NOT EXISTS idx_impl_evidence_impl_id ON implementation_evidence(implementation_id);
CREATE INDEX IF NOT EXISTS idx_impl_blockers_impl_id ON implementation_blockers(implementation_id);
