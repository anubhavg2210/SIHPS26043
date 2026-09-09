-- Migration 001: Duplicate Detection
-- Enables pg_trgm for trigram text similarity and creates the
-- problem_duplicate_matches table used by duplicateService.js.
--
-- Safe to run multiple times (uses IF NOT EXISTS).

-- 1. Enable trigram similarity extension (requires superuser once per database)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Duplicate match results table
CREATE TABLE IF NOT EXISTS problem_duplicate_matches (
    id                  SERIAL PRIMARY KEY,

    -- The newly submitted problem
    problem_id          INTEGER NOT NULL
                            REFERENCES problems(id) ON DELETE CASCADE,

    -- The existing problem it was compared against
    matched_problem_id  INTEGER NOT NULL
                            REFERENCES problems(id) ON DELETE CASCADE,

    -- Combined similarity score in [0, 1]
    similarity_score    NUMERIC(5,4) NOT NULL,

    -- POSSIBLE_DUPLICATE (>= 0.80) or SIMILAR (0.60-0.79)
    classification      VARCHAR(30) NOT NULL,

    -- Human-readable signals that contributed to the score
    signals             TEXT[] NOT NULL DEFAULT '{}',

    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- A pair can only be stored once
    CONSTRAINT problem_duplicate_matches_unique
        UNIQUE (problem_id, matched_problem_id),

    -- A problem can never match itself
    CONSTRAINT problem_duplicate_matches_not_self
        CHECK (problem_id <> matched_problem_id)
);

CREATE INDEX IF NOT EXISTS idx_dup_problem_id
    ON problem_duplicate_matches(problem_id);

CREATE INDEX IF NOT EXISTS idx_dup_matched_id
    ON problem_duplicate_matches(matched_problem_id);
