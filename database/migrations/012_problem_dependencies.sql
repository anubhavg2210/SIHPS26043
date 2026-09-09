-- ============================================================================
-- Migration 012: Problem Dependency Mapping
-- ============================================================================
-- Evolving existing problem_dependencies table with enterprise auditing,
-- deterministic verification lifecycle, explainable signals, and strict constraints.
--
-- Direction:
--   problem_id = downstream problem (the problem that depends on the other)
--   depends_on_problem_id = upstream problem (the prerequisite/causal problem)
-- ============================================================================

-- 1. Evolve existing problem_dependencies columns
ALTER TABLE problem_dependencies
    ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) NOT NULL DEFAULT 'HUMAN',
    ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'PROPOSED',
    ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS verification_notes TEXT,
    ADD COLUMN IF NOT EXISTS reasoning TEXT,
    ADD COLUMN IF NOT EXISTS signals JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 2. Alter column types and defaults if needed
ALTER TABLE problem_dependencies
    ALTER COLUMN confidence TYPE NUMERIC(5, 2),
    ALTER COLUMN dependency_type SET DEFAULT 'BLOCKS_SOLUTION';

-- 3. Constraints
DO $$
BEGIN
    -- No self-dependency constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_no_self_dependency'
    ) THEN
        ALTER TABLE problem_dependencies
            ADD CONSTRAINT chk_no_self_dependency CHECK (problem_id <> depends_on_problem_id);
    END IF;

    -- Valid source types
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_dependency_source_type'
    ) THEN
        ALTER TABLE problem_dependencies
            ADD CONSTRAINT chk_dependency_source_type
            CHECK (source_type IN ('AI', 'HUMAN', 'RESEARCHER', 'AUTHORITY', 'STUDENT', 'STARTUP', 'OTHER'));
    END IF;

    -- Valid verification statuses
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_dependency_verification_status'
    ) THEN
        ALTER TABLE problem_dependencies
            ADD CONSTRAINT chk_dependency_verification_status
            CHECK (verification_status IN ('PROPOSED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'));
    END IF;

    -- Valid dependency types
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_dependency_type'
    ) THEN
        ALTER TABLE problem_dependencies
            ADD CONSTRAINT chk_dependency_type
            CHECK (dependency_type IN ('BLOCKS_SOLUTION', 'CAUSES', 'EXACERBATES', 'SHARED_ROOT_CAUSE', 'TEMPORAL_SEQUENCE'));
    END IF;

    -- Bounded confidence
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_dependency_confidence'
    ) THEN
        ALTER TABLE problem_dependencies
            ADD CONSTRAINT chk_dependency_confidence
            CHECK (confidence IS NULL OR (confidence >= 0.0 AND confidence <= 100.0));
    END IF;
END $$;

-- 4. Indexes for fast upstream & downstream graph traversals
CREATE INDEX IF NOT EXISTS idx_problem_dependencies_problem_id
    ON problem_dependencies(problem_id);

CREATE INDEX IF NOT EXISTS idx_problem_dependencies_depends_on
    ON problem_dependencies(depends_on_problem_id);

CREATE INDEX IF NOT EXISTS idx_problem_dependencies_type
    ON problem_dependencies(dependency_type);

CREATE INDEX IF NOT EXISTS idx_problem_dependencies_verification
    ON problem_dependencies(verification_status);

CREATE INDEX IF NOT EXISTS idx_problem_dependencies_created_by
    ON problem_dependencies(created_by);
