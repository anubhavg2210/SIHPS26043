-- ============================================================================
-- Migration 014: Rankings, Reputation, and Rewards
-- ============================================================================

-- 1. Evolve existing reputation table
ALTER TABLE reputation
    ADD COLUMN IF NOT EXISTS lifetime_score INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS current_rank_score INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS verified_impact_score NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS completed_implementations INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS approved_solutions INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS verified_contributions_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tier VARCHAR(30) NOT NULL DEFAULT 'BRONZE',
    ADD COLUMN IF NOT EXISTS first_contribution_at TIMESTAMP WITH TIME ZONE NULL,
    ADD COLUMN IF NOT EXISTS last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_reputation_lifetime_non_neg'
    ) THEN
        ALTER TABLE reputation ADD CONSTRAINT chk_reputation_lifetime_non_neg CHECK (lifetime_score >= 0);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_reputation_rank_non_neg'
    ) THEN
        ALTER TABLE reputation ADD CONSTRAINT chk_reputation_rank_non_neg CHECK (current_rank_score >= 0);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reputation_current_rank ON reputation (current_rank_score DESC);
CREATE INDEX IF NOT EXISTS idx_reputation_lifetime ON reputation (lifetime_score DESC);
CREATE INDEX IF NOT EXISTS idx_reputation_user ON reputation (user_id);

-- 2. Evolve existing badges table
ALTER TABLE badges
    ADD COLUMN IF NOT EXISTS slug VARCHAR(60) UNIQUE,
    ADD COLUMN IF NOT EXISTS category VARCHAR(40) NOT NULL DEFAULT 'GENERAL',
    ADD COLUMN IF NOT EXISTS tier VARCHAR(20) NOT NULL DEFAULT 'BRONZE',
    ADD COLUMN IF NOT EXISTS icon_url VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS criteria JSONB NOT NULL DEFAULT '{}';

-- 3. Evolve existing user_badges table
ALTER TABLE user_badges
    ADD COLUMN IF NOT EXISTS evidence JSONB NOT NULL DEFAULT '{}';

-- 4. Create reputation_events table (append-only ledger)
CREATE TABLE IF NOT EXISTS reputation_events (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contribution_type VARCHAR(60) NOT NULL,
    points INTEGER NOT NULL,
    multiplier NUMERIC NOT NULL DEFAULT 1.0,
    source_entity_type VARCHAR(40) NOT NULL,
    source_entity_id BIGINT NOT NULL,
    actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reputation_events_dedup
    ON reputation_events (user_id, source_entity_type, source_entity_id, contribution_type);

CREATE INDEX IF NOT EXISTS idx_reputation_events_user_created
    ON reputation_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reputation_events_type
    ON reputation_events (contribution_type);

-- 5. Create institution_reputation table (university/institutional aggregation)
CREATE TABLE IF NOT EXISTS institution_reputation (
    institution_id INTEGER PRIMARY KEY REFERENCES institutions(id) ON DELETE CASCADE,
    total_reputation INTEGER NOT NULL DEFAULT 0,
    active_rank_score INTEGER NOT NULL DEFAULT 0,
    active_students_count INTEGER NOT NULL DEFAULT 0,
    active_researchers_count INTEGER NOT NULL DEFAULT 0,
    approved_solutions_count INTEGER NOT NULL DEFAULT 0,
    completed_pilots_count INTEGER NOT NULL DEFAULT 0,
    verified_impact_score NUMERIC NOT NULL DEFAULT 0,
    tier VARCHAR(30) NOT NULL DEFAULT 'BRONZE',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inst_reputation_score
    ON institution_reputation (active_rank_score DESC);

-- 6. Seed 15 standard badges idempotently
INSERT INTO badges (name, slug, description, category, tier, criteria)
VALUES
    ('Civic Scout', 'civic-scout', 'Reported 1 authority-verified civic problem', 'CITIZEN', 'BRONZE', '{"verified_problems_min": 1}'::jsonb),
    ('Civic Guardian', 'civic-guardian', 'Reported 5 verified problems and provided constructive community validation', 'CITIZEN', 'SILVER', '{"verified_problems_min": 5, "feedback_min": 2}'::jsonb),
    ('Community Champion', 'community-champion', '10 verified problems leading to verified societal resolution', 'CITIZEN', 'GOLD', '{"verified_problems_min": 10, "resolved_min": 1}'::jsonb),

    ('Problem Solver', 'problem-solver', 'Designed 1 approved technical solution for a verified societal problem', 'STUDENT', 'BRONZE', '{"approved_solutions_min": 1}'::jsonb),
    ('Field Builder', 'field-builder', 'Successfully executed 3 verified pilot implementation milestones', 'STUDENT', 'SILVER', '{"completed_milestones_min": 3}'::jsonb),
    ('Civic Innovator', 'civic-innovator', 'Led or contributed to a completed pilot with verified societal impact score >= 75', 'STUDENT', 'GOLD', '{"completed_pilots_min": 1, "impact_score_min": 75}'::jsonb),

    ('Root Cause Analyst', 'root-cause-analyst', 'Formulated 2 authority-verified root cause diagnoses', 'RESEARCHER', 'BRONZE', '{"verified_root_causes_min": 2}'::jsonb),
    ('Scientific Advisor', 'scientific-advisor', 'Served as technical advisor on 2 approved municipal solutions', 'RESEARCHER', 'SILVER', '{"solution_advisories_min": 2}'::jsonb),
    ('Societal Impact Scholar', 'impact-scholar', 'Research lead on an implementation with verified societal impact score >= 85', 'RESEARCHER', 'GOLD', '{"lead_impact_min": 1, "impact_score_min": 85}'::jsonb),

    ('Active Campus', 'active-campus', 'Institution with 5+ actively participating students and researchers', 'UNIVERSITY', 'BRONZE', '{"active_contributors_min": 5}'::jsonb),
    ('Civic Innovation Hub', 'civic-hub', '3 approved municipal solutions originating from campus researchers or students', 'UNIVERSITY', 'SILVER', '{"approved_solutions_min": 3}'::jsonb),
    ('Impact Campus of the Year', 'impact-campus', '2 completed implementations with verified sustained societal outcomes', 'UNIVERSITY', 'GOLD', '{"completed_pilots_min": 2, "sustained_impact_min": 1}'::jsonb),

    ('Societal Innovator', 'societal-innovator', 'Startup or MSME with 1 approved civic challenge solution', 'STARTUP_MSME', 'BRONZE', '{"approved_solutions_min": 1}'::jsonb),
    ('Pilot Deployer', 'pilot-deployer', 'Successfully completed 1 municipal pilot project deployment', 'STARTUP_MSME', 'SILVER', '{"completed_pilots_min": 1}'::jsonb),
    ('Sustainable Impact Partner', 'sustainable-impact-partner', '2 completed deployments with verified impact score >= 80', 'STARTUP_MSME', 'GOLD', '{"completed_pilots_min": 2, "impact_score_min": 80}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    tier = EXCLUDED.tier,
    criteria = EXCLUDED.criteria;
