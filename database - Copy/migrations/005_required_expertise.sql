-- Migration 005: Add required_expertise column to problems table
--
-- Safely adds the required_expertise array column if it does not already exist.
-- This persists the exact academic domain expertise identified by the AI service,
-- which was previously discarded in favor of generic ai_keywords.

ALTER TABLE problems
ADD COLUMN IF NOT EXISTS required_expertise TEXT[];
