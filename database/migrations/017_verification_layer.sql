-- 017_verification_layer.sql
-- Phase 3: M13 Verification & Confidence

BEGIN;

-- 1. Rename existing implementation_evidence table to verification_evidence
ALTER TABLE implementation_evidence RENAME TO verification_evidence;
ALTER SEQUENCE implementation_evidence_id_seq RENAME TO verification_evidence_id_seq;

-- 2. Rename columns to generic terms
ALTER TABLE verification_evidence RENAME COLUMN uploaded_by TO submitted_by;
ALTER TABLE verification_evidence RENAME COLUMN file_url TO reference;

-- 3. Modify implementation_id to be nullable to support polymorphic-like targets
ALTER TABLE verification_evidence ALTER COLUMN implementation_id DROP NOT NULL;

-- 4. Add new columns
ALTER TABLE verification_evidence 
    ADD COLUMN impact_assessment_id INT REFERENCES implementation_impact_assessments(id) ON DELETE CASCADE,
    ADD COLUMN verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    ADD COLUMN verified_by INT REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN reviewer_remarks TEXT,
    ADD COLUMN verified_at TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 5. Add strict check constraint to ensure one target is specified
ALTER TABLE verification_evidence
    ADD CONSTRAINT chk_verification_target 
    CHECK (
        (implementation_id IS NOT NULL AND impact_assessment_id IS NULL) OR
        (impact_assessment_id IS NOT NULL AND implementation_id IS NULL)
    );

-- 6. Add indexes for performance
CREATE INDEX idx_verification_evidence_impact_id ON verification_evidence(impact_assessment_id);
CREATE INDEX idx_verification_evidence_status ON verification_evidence(verification_status);

COMMIT;
