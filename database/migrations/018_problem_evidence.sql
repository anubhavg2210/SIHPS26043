-- 018_problem_evidence.sql
-- Add photo/video evidence support directly to problems table

BEGIN;

ALTER TABLE problems 
    ADD COLUMN IF NOT EXISTS evidence_url TEXT,
    ADD COLUMN IF NOT EXISTS evidence_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS evidence_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS evidence_size INTEGER;

COMMIT;
