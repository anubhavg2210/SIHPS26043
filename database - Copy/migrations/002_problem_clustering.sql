-- Migration 002: Problem Clustering
--
-- The problem_clusters table and problems.cluster_id column already exist.
-- This migration only adds performance indexes that are safe to apply
-- incrementally. All statements use IF NOT EXISTS.

-- Index on problems.cluster_id for fast cluster membership lookups.
-- Used by:  GET /api/clusters/:id  (fetches all problems in a cluster)
--           refreshClusterMetadata  (COUNT/MAX aggregation on cluster_id)
CREATE INDEX IF NOT EXISTS idx_problems_cluster_id
    ON problems(cluster_id);

-- Index on problem_clusters.category for fast category-based cluster lookup.
-- Not strictly required at hackathon scale but helps as data grows.
CREATE INDEX IF NOT EXISTS idx_clusters_category
    ON problem_clusters(category);
