-- Phase 1 backend extension: category status + aliases + new alert types
-- Boaz-approved 2026-04-17. See phase1-backend-extension.md.

-- Extend category_status enum. Old 'pending_approval' value retained for safety;
-- new code paths use 'suggested'.
ALTER TYPE category_status ADD VALUE IF NOT EXISTS 'suggested';
ALTER TYPE category_status ADD VALUE IF NOT EXISTS 'deactivated';

-- Extend alert_type enum. Consolidated 'recommendation_complete' into 'approval_ready'
-- to avoid duplicate inbox entries when the 3rd recommendation arrives.
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'approval_ready';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'deadline_warning';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'application_expired';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'provider_ping';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'contact_message';

CREATE TABLE category_aliases (
  id SERIAL PRIMARY KEY,
  alias TEXT NOT NULL UNIQUE,
  category_id INTEGER NOT NULL REFERENCES service_categories_registry(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_category_aliases_category ON category_aliases(category_id);
