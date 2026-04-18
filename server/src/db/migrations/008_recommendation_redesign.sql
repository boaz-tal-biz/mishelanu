-- Recommendation system redesign — backend half.
-- Boaz-approved 2026-04-18.
--
-- Adds the new recommender contact fields, structured relationship_type, opt-in
-- flags, the details_scrubbed marker, and an audit log table for scrub events.
-- Old columns (recommender_name, relationship enum, recommendation_text,
-- recommender_email) are RETAINED for raw-data preservation per the project's
-- design principle. Code paths now read/write the new columns and the scrub
-- routine clears both old and new contact-bearing columns when triggered.
--
-- Backfill notes:
--   recommender_first_name / surname split off recommender_name on the first
--     space; surname falls back to "—" if none.
--   relationship_type maps the legacy enum:
--     Client            → personal_work
--     Colleague         → personal_known
--     Friend/Family     → personal_known
--     Community member  → hearsay
--   service_description seeds from recommendation_text so the new admin view
--     has something to show for legacy rows.
--
-- recommender_email and recommender_phone stay nullable in the schema. The API
-- enforces NOT NULL on new submissions; the DB stays permissive so legacy rows
-- (which had no phone, and possibly no email) and any future scrubbed rows can
-- coexist without constraint violations.

ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'opt_in_interest';

ALTER TABLE recommendations
  ADD COLUMN recommender_first_name TEXT,
  ADD COLUMN recommender_surname TEXT,
  ADD COLUMN recommender_phone TEXT,
  ADD COLUMN relationship_type TEXT,
  ADD COLUMN how_long_known TEXT,
  ADD COLUMN last_service_date TEXT,
  ADD COLUMN service_description TEXT,
  ADD COLUMN opt_in_provider BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN opt_in_user BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN details_scrubbed BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE recommendations
SET
  recommender_first_name = COALESCE(
    NULLIF(split_part(recommender_name, ' ', 1), ''),
    '—'
  ),
  recommender_surname = CASE
    WHEN recommender_name ILIKE '% %'
      THEN substring(recommender_name FROM position(' ' IN recommender_name) + 1)
    ELSE '—'
  END,
  relationship_type = CASE relationship::text
    WHEN 'Client'          THEN 'personal_work'
    WHEN 'Colleague'       THEN 'personal_known'
    WHEN 'Friend/Family'   THEN 'personal_known'
    WHEN 'Community member' THEN 'hearsay'
    ELSE 'personal_known'
  END,
  service_description = recommendation_text
WHERE recommender_first_name IS NULL;

ALTER TABLE recommendations
  ALTER COLUMN recommender_first_name SET NOT NULL,
  ALTER COLUMN recommender_surname    SET NOT NULL,
  ALTER COLUMN relationship_type      SET NOT NULL,
  ADD CONSTRAINT recommendations_relationship_type_valid
    CHECK (relationship_type IN ('personal_work', 'personal_known', 'personal_both', 'hearsay'));

CREATE TABLE recommendation_scrub_log (
  id SERIAL PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  records_scrubbed INTEGER NOT NULL,
  triggered_by TEXT NOT NULL,
  scrubbed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scrub_log_trigger_valid
    CHECK (triggered_by IN ('admin_approval', 'application_expired', 'manual'))
);

CREATE INDEX idx_scrub_log_provider ON recommendation_scrub_log(provider_id);
CREATE INDEX idx_recommendations_scrubbed ON recommendations(details_scrubbed);
