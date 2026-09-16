-- Migration 017: Trust & Anti-Gaming Layer

CREATE TABLE IF NOT EXISTS trust_events (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'LOW' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
    status VARCHAR(20) NOT NULL DEFAULT 'FLAGGED' CHECK (status IN ('FLAGGED', 'REVIEWED', 'NORMAL')),
    reason TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    reviewed_by INT REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    reviewer_remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trust_events_user_id ON trust_events(user_id);
CREATE INDEX IF NOT EXISTS idx_trust_events_status ON trust_events(status);
CREATE INDEX IF NOT EXISTS idx_trust_events_created_at ON trust_events(created_at);
