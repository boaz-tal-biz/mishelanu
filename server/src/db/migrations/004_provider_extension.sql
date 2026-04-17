-- Phase 1 backend extension: providers schema
-- Boaz-approved 2026-04-17. See phase1-backend-extension.md.
-- Test providers are wiped — fresh start, no backfill required.

-- Wipe test data in FK-safe order. NOT using TRUNCATE CASCADE — it would take
-- service_categories_registry with it (nullable FK to providers) and destroy the seed.
DELETE FROM outbound_messages;
DELETE FROM profile_visits;
DELETE FROM recommendations;
DELETE FROM admin_alerts;
DELETE FROM service_requests;
UPDATE service_categories_registry SET suggested_by_provider_id = NULL;
DELETE FROM providers;

ALTER TABLE providers
  ADD COLUMN first_name TEXT,
  ADD COLUMN surname TEXT,
  ADD COLUMN area_covered TEXT,
  ADD COLUMN vat_number TEXT,
  ADD COLUMN companies_house_number TEXT,
  ADD COLUMN sole_trader_utr TEXT,
  ADD COLUMN years_in_business INTEGER,
  ADD COLUMN affiliations TEXT,
  ADD COLUMN application_deadline TIMESTAMPTZ,
  ADD COLUMN restart_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN application_expired BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN admin_approved BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN admin_approved_at TIMESTAMPTZ,
  ADD COLUMN parsed_alias_suggestions JSONB;

ALTER TABLE providers DROP COLUMN full_name;

ALTER TABLE providers
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN surname SET NOT NULL;

ALTER TABLE providers
  ADD CONSTRAINT providers_restart_count_max CHECK (restart_count >= 0 AND restart_count <= 2);
