-- Migration 003: Authority Dashboard Indexes
--
-- Adds read-optimized indexes for the dashboard query patterns.
-- All statements are idempotent (CREATE INDEX IF NOT EXISTS).
--
-- Existing indexes already covering problems: problems_pkey, idx_problems_cluster_id
-- Missing and genuinely useful for dashboard aggregations:

-- Filter / GROUP BY status
CREATE INDEX IF NOT EXISTS idx_problems_status
    ON problems(status);

-- Filter / GROUP BY district
CREATE INDEX IF NOT EXISTS idx_problems_district
    ON problems(district);

-- Filter / GROUP BY category
CREATE INDEX IF NOT EXISTS idx_problems_category
    ON problems(category);

-- ORDER BY priority_score DESC  (priority queue endpoint)
CREATE INDEX IF NOT EXISTS idx_problems_priority_score
    ON problems(priority_score DESC);

-- ORDER BY updated_at DESC  (recent activity endpoint)
CREATE INDEX IF NOT EXISTS idx_problems_updated_at
    ON problems(updated_at DESC);
