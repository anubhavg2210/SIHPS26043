-- ============================================================================
-- Migration 013: Smart Notifications
-- ============================================================================
-- Centralized in-app smart notification engine for the SIH26043 platform.
--
-- Features:
--   - Recipient resolution from existing database relationships
--   - Deduplication key & cooldown tracking to eliminate spam
--   - Multi-tier priority: LOW, NORMAL, HIGH, CRITICAL
--   - Non-blocking asynchronous dispatch
--   - Actor exclusion
--   - Read/Unread state with audit timestamps
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    recipient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id INTEGER NOT NULL,
    priority VARCHAR(16) NOT NULL DEFAULT 'NORMAL',
    action_url VARCHAR(512),
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP,
    dedup_key VARCHAR(128),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Priority check constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_notification_priority'
    ) THEN
        ALTER TABLE notifications
            ADD CONSTRAINT chk_notification_priority
            CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL'));
    END IF;
END $$;

-- Action URL relative path constraint (must start with '/' or be null)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_notification_action_url'
    ) THEN
        ALTER TABLE notifications
            ADD CONSTRAINT chk_notification_action_url
            CHECK (action_url IS NULL OR action_url ~ '^/[a-zA-Z0-9/_?=&%-]*$');
    END IF;
END $$;

-- Fast query indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
    ON notifications(recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
    ON notifications(recipient_user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_dedup
    ON notifications(dedup_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_priority
    ON notifications(priority);

CREATE INDEX IF NOT EXISTS idx_notifications_event_type
    ON notifications(event_type);
