-- Phase 1 backend extension (continued):
-- Add payment_types, business_size, and management_token to providers.
-- Boaz-approved 2026-04-17. See phase1-backend-extension.md.

ALTER TABLE providers
  ADD COLUMN payment_types TEXT[],
  ADD COLUMN payment_types_other TEXT,
  ADD COLUMN business_size TEXT,
  ADD COLUMN business_size_other TEXT,
  ADD COLUMN management_token UUID DEFAULT gen_random_uuid();

-- Backfill any pre-existing rows (no-op on a clean DB after 004 wipe).
UPDATE providers SET management_token = gen_random_uuid() WHERE management_token IS NULL;

ALTER TABLE providers
  ALTER COLUMN management_token SET NOT NULL,
  ADD CONSTRAINT providers_management_token_unique UNIQUE (management_token);

ALTER TABLE providers
  ADD CONSTRAINT providers_payment_types_valid
    CHECK (
      payment_types IS NULL
      OR payment_types <@ ARRAY['cash','card','bank_transfer','other']::text[]
    ),
  ADD CONSTRAINT providers_business_size_valid
    CHECK (
      business_size IS NULL
      OR business_size IN ('small','medium','large','other')
    );
