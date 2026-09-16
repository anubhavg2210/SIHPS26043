-- Migration 008: Solution Evaluations
--
-- Creates the solution_evaluations table for multi-criteria scoring
-- of submitted solutions by authorized evaluators (AUTHORITY and ADMIN).
--
-- Safe to run multiple times (uses IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS solution_evaluations (
    id                      SERIAL PRIMARY KEY,
    solution_id             INTEGER NOT NULL
                                REFERENCES solutions(id) ON DELETE CASCADE,
    evaluator_id            INTEGER NOT NULL
                                REFERENCES users(id) ON DELETE RESTRICT,

    -- 6 Normalized Evaluation Dimensions (Rating: 1 to 5)
    impact_score            INTEGER NOT NULL CHECK (impact_score BETWEEN 1 AND 5),
    feasibility_score       INTEGER NOT NULL CHECK (feasibility_score BETWEEN 1 AND 5),
    cost_efficiency_score   INTEGER NOT NULL CHECK (cost_efficiency_score BETWEEN 1 AND 5),
    scalability_score       INTEGER NOT NULL CHECK (scalability_score BETWEEN 1 AND 5),
    evidence_score          INTEGER NOT NULL CHECK (evidence_score BETWEEN 1 AND 5),
    risk_score              INTEGER NOT NULL CHECK (risk_score BETWEEN 1 AND 5),

    -- Computed Deterministic Composite Score [20.00 to 100.00]
    composite_score         NUMERIC(5, 2) NOT NULL CHECK (composite_score BETWEEN 0.00 AND 100.00),

    -- Qualitative Feedback & Decision Recommendation
    comments                TEXT,
    recommendation          VARCHAR(30) NOT NULL DEFAULT 'CONSIDER'
                                CHECK (recommendation IN ('RECOMMENDED', 'CONSIDER', 'NOT_RECOMMENDED')),

    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- One evaluation per evaluator per solution (supports upsert/update)
    CONSTRAINT uq_solution_evaluator UNIQUE (solution_id, evaluator_id)
);

CREATE INDEX IF NOT EXISTS idx_solution_evaluations_solution_id
    ON solution_evaluations(solution_id);

CREATE INDEX IF NOT EXISTS idx_solution_evaluations_evaluator_id
    ON solution_evaluations(evaluator_id);
