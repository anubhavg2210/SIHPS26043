-- =============================================================================
-- Migration 016: Collaboration Teams (M9)
-- Creates:
--   collaboration_teams        — team entities linked to problems
--   collaboration_team_members — membership with roles and invitation status
-- Extends:
--   solutions.team_id          — optional nullable link (backward-compatible)
-- =============================================================================

-- 1. Team status and member role ENUMs (plain CHECK constraints to match project convention)

CREATE TABLE IF NOT EXISTS collaboration_teams (
    id          SERIAL PRIMARY KEY,
    problem_id  INT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL CHECK (LENGTH(TRIM(name)) > 0),
    created_by  INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status      VARCHAR(20) NOT NULL DEFAULT 'FORMING'
                    CHECK (status IN ('FORMING', 'ACTIVE', 'COMPLETED', 'CLOSED')),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collaboration_team_members (
    id                SERIAL PRIMARY KEY,
    team_id           INT NOT NULL REFERENCES collaboration_teams(id) ON DELETE CASCADE,
    user_id           INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role              VARCHAR(20) NOT NULL DEFAULT 'CITIZEN'
                          CHECK (role IN ('LEAD', 'FACULTY', 'STUDENT', 'RESEARCHER', 'STARTUP', 'MSME', 'CITIZEN')),
    membership_status VARCHAR(20) NOT NULL DEFAULT 'INVITED'
                          CHECK (membership_status IN ('INVITED', 'ACTIVE', 'DECLINED', 'REMOVED')),
    joined_at         TIMESTAMP,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (team_id, user_id)
);

-- 2. Optional link from solutions to a collaboration team (nullable, backward-compatible)
ALTER TABLE solutions
    ADD COLUMN IF NOT EXISTS team_id INT REFERENCES collaboration_teams(id) ON DELETE SET NULL;
