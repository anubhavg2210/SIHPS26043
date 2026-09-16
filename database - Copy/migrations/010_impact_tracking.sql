-- Migration 010: Impact Tracking
--
-- Creates tables for tracking measurable outcomes, before/after metrics,
-- citizen post-implementation feedback, and authority verification.
--
-- Safe to run multiple times (uses IF NOT EXISTS).

-- 1. Main Impact Assessment Record
CREATE TABLE IF NOT EXISTS implementation_impact_assessments (
    id                          SERIAL PRIMARY KEY,
    implementation_id           INTEGER NOT NULL UNIQUE
                                    REFERENCES solution_implementations(id) ON DELETE CASCADE,
    problem_id                  INTEGER NOT NULL
                                    REFERENCES problems(id) ON DELETE CASCADE,

    measurement_start_date      DATE NOT NULL,
    measurement_end_date        DATE NOT NULL,

    outcome_summary             TEXT,
    impact_score                NUMERIC(5, 2) NOT NULL DEFAULT 0.00
                                    CHECK (impact_score BETWEEN 0.00 AND 100.00),

    verification_status         VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED'
                                    CHECK (verification_status IN ('UNVERIFIED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED')),
    verified_by                 INTEGER
                                    REFERENCES users(id) ON DELETE SET NULL,
    verified_at                 TIMESTAMP,
    verification_notes          TEXT,

    is_sustained                BOOLEAN NOT NULL DEFAULT FALSE,
    sustained_monitoring_date   DATE,
    sustained_notes             TEXT,

    created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_assessment_dates
        CHECK (measurement_end_date >= measurement_start_date)
);

-- 2. Structured Domain-Agnostic Numeric Impact Metrics
CREATE TABLE IF NOT EXISTS impact_metrics (
    id                          SERIAL PRIMARY KEY,
    impact_assessment_id       INTEGER NOT NULL
                                    REFERENCES implementation_impact_assessments(id) ON DELETE CASCADE,

    metric_name                 VARCHAR(100) NOT NULL,
    category                    VARCHAR(50) NOT NULL DEFAULT 'GENERAL'
                                    CHECK (category IN ('GENERAL', 'ENVIRONMENTAL', 'PUBLIC_HEALTH', 'INFRASTRUCTURE', 'ECONOMIC', 'SOCIAL', 'GOVERNANCE')),
    unit                        VARCHAR(50) NOT NULL,

    direction                   VARCHAR(20) NOT NULL DEFAULT 'INCREASE'
                                    CHECK (direction IN ('INCREASE', 'DECREASE', 'TARGET')),

    baseline_value              NUMERIC(14, 2) NOT NULL,
    target_value                NUMERIC(14, 2) NOT NULL,
    actual_value                NUMERIC(14, 2) NOT NULL,

    achievement_percentage      NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    measurement_date            DATE NOT NULL DEFAULT CURRENT_DATE,
    evidence_url                TEXT,

    created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Citizen Validation & Post-Implementation Feedback
CREATE TABLE IF NOT EXISTS impact_citizen_feedback (
    id                          SERIAL PRIMARY KEY,
    impact_assessment_id       INTEGER NOT NULL
                                    REFERENCES implementation_impact_assessments(id) ON DELETE CASCADE,
    user_id                     INTEGER NOT NULL
                                    REFERENCES users(id) ON DELETE CASCADE,

    rating                      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    is_resolved                 BOOLEAN NOT NULL,
    comment                     TEXT,
    observed_outcome            TEXT,

    created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Exactly one feedback entry per citizen per impact assessment (enables upsert)
    CONSTRAINT uq_impact_citizen_feedback UNIQUE (impact_assessment_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_impact_impl_id ON implementation_impact_assessments(implementation_id);
CREATE INDEX IF NOT EXISTS idx_impact_problem_id ON implementation_impact_assessments(problem_id);
CREATE INDEX IF NOT EXISTS idx_impact_metrics_assessment_id ON impact_metrics(impact_assessment_id);
CREATE INDEX IF NOT EXISTS idx_impact_feedback_assessment_id ON impact_citizen_feedback(impact_assessment_id);
CREATE INDEX IF NOT EXISTS idx_impact_feedback_user_id ON impact_citizen_feedback(user_id);
