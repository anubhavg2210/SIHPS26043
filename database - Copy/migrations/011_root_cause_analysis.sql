-- Migration 011: Root Cause Analysis
--
-- Non-destructive, idempotent evolution of existing root_causes table
-- and creation of the link-based root_cause_evidence ledger.
--
-- Safe to run multiple times (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

-- 1. Evolve existing root_causes table
ALTER TABLE root_causes
    ADD COLUMN IF NOT EXISTS proposed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS source_type VARCHAR(30) NOT NULL DEFAULT 'HUMAN',
    ADD COLUMN IF NOT EXISTS cause_type VARCHAR(20) NOT NULL DEFAULT 'CONTRIBUTING'
        CHECK (cause_type IN ('PRIMARY', 'CONTRIBUTING')),
    ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'GENERAL'
        CHECK (category IN ('GENERAL', 'INFRASTRUCTURE', 'ENVIRONMENTAL', 'OPERATIONAL', 'POLICY_REGULATORY', 'SOCIO_ECONOMIC', 'TECHNICAL', 'BIOLOGICAL_HEALTH')),
    ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) NOT NULL DEFAULT 'PROPOSED'
        CHECK (verification_status IN ('PROPOSED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED')),
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS verification_notes TEXT,
    ADD COLUMN IF NOT EXISTS reasoning TEXT,
    ADD COLUMN IF NOT EXISTS signals JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Ensure confidence column supports 0.00 to 100.00 scale
ALTER TABLE root_causes
    ALTER COLUMN confidence TYPE NUMERIC(5, 2),
    ALTER COLUMN confidence SET DEFAULT 50.00;

-- Ensure source_type check constraint allows 'HUMAN'
ALTER TABLE root_causes DROP CONSTRAINT IF EXISTS root_causes_source_type_check;
ALTER TABLE root_causes ADD CONSTRAINT root_causes_source_type_check
    CHECK (source_type IN ('AI', 'HUMAN', 'RESEARCHER', 'AUTHORITY', 'STUDENT', 'CITIZEN', 'COMMUNITY', 'OTHER'));

-- Backfill verification_status from legacy verified boolean if present
UPDATE root_causes
SET verification_status = 'VERIFIED'
WHERE verified = TRUE AND (verification_status IS NULL OR verification_status = 'PROPOSED');

-- 2. Expression-based unique index for case-insensitive duplicate cause prevention per problem
CREATE UNIQUE INDEX IF NOT EXISTS uq_problem_cause_text
    ON root_causes (problem_id, LOWER(TRIM(cause)));

-- 3. Partial unique index to enforce concurrency safety: at most ONE PRIMARY cause per problem
CREATE UNIQUE INDEX IF NOT EXISTS uq_problem_primary_cause
    ON root_causes (problem_id)
    WHERE cause_type = 'PRIMARY';

-- 4. Dedicated Multi-Evidence Ledger for Root Causes (Link-based)
CREATE TABLE IF NOT EXISTS root_cause_evidence (
    id                  SERIAL PRIMARY KEY,
    root_cause_id       INTEGER NOT NULL
                            REFERENCES root_causes(id) ON DELETE CASCADE,
    submitted_by        INTEGER NOT NULL
                            REFERENCES users(id) ON DELETE CASCADE,
    evidence_type       VARCHAR(50) NOT NULL DEFAULT 'FIELD_OBSERVATION'
                            CHECK (evidence_type IN (
                                'FIELD_OBSERVATION',
                                'LAB_REPORT',
                                'RESEARCH_CITATION',
                                'GOVERNMENT_RECORD',
                                'DATASET',
                                'MEDIA_LINK',
                                'COMMUNITY_REPORT'
                            )),
    title               VARCHAR(200) NOT NULL,
    description         TEXT,
    evidence_url        TEXT NOT NULL,
    confidence_weight   NUMERIC(3, 2) NOT NULL DEFAULT 1.00
                            CHECK (confidence_weight BETWEEN 0.10 AND 2.00),
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_root_causes_problem_id ON root_causes(problem_id);
CREATE INDEX IF NOT EXISTS idx_root_causes_status ON root_causes(verification_status);
CREATE INDEX IF NOT EXISTS idx_root_cause_evidence_rc_id ON root_cause_evidence(root_cause_id);
