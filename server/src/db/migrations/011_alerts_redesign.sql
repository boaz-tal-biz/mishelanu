-- Redesign admin_alerts: drop enum constraint, add tier/read/resolved fields.
-- Preserves existing data by migrating columns in place.

-- 1. Add new columns
ALTER TABLE admin_alerts
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS tier TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resolved_by INTEGER REFERENCES admin_users(id),
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recommendation_id INTEGER;

-- 2. Migrate existing data: copy alert_type → type, set tier/title from type
UPDATE admin_alerts SET type = alert_type::text WHERE type IS NULL;
UPDATE admin_alerts SET tier = CASE
  WHEN type IN ('new_registration', 'approval_ready', 'provider_ping', 'contact_message', 'deadline_warning', 'application_expired', 'missing_recommendations', 'renewal_due') THEN 'action_required'
  WHEN type IN ('category_suggestion', 'opt_in_interest') THEN 'action_required'
  ELSE 'informational'
END WHERE tier IS NULL;
UPDATE admin_alerts SET title = alert_message WHERE title IS NULL;

-- 3. Migrate dismissed → is_resolved
UPDATE admin_alerts SET is_resolved = dismissed, is_read = dismissed;

-- 4. Make new columns NOT NULL (after populating)
ALTER TABLE admin_alerts ALTER COLUMN type SET NOT NULL;
ALTER TABLE admin_alerts ALTER COLUMN tier SET NOT NULL;
ALTER TABLE admin_alerts ALTER COLUMN title SET NOT NULL;

-- 5. Rename alert_message to message (keep as nullable detail field)
ALTER TABLE admin_alerts RENAME COLUMN alert_message TO message;

-- 6. Drop old columns
ALTER TABLE admin_alerts DROP COLUMN IF EXISTS alert_type;
ALTER TABLE admin_alerts DROP COLUMN IF EXISTS dismissed;
ALTER TABLE admin_alerts DROP COLUMN IF EXISTS due_date;

-- 7. New indexes
CREATE INDEX IF NOT EXISTS idx_admin_alerts_type ON admin_alerts(type);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_tier ON admin_alerts(tier);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_is_resolved ON admin_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_created_at ON admin_alerts(created_at);
