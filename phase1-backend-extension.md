# Mishelanu — Phase 1 Backend Extension Brief

**Date:** 2026-04-17
**Status:** [Boaz-approved] 2026-04-17
**Extends:** `admin-feedback-scope.md` — adds backend/data-model work needed to support that scope and Phase 1 operations.

---

## Decisions captured from review

- **Existing test providers:** wipe on migration. No retroactive name-split or backfill needed — start fresh.
- **Categories:** Option A (minimal) — extend `service_categories_registry` in place. Two-tier hierarchy restructure is **not** in this brief; deferred. Aliases sit on top of the flat structure.
- **Admin action on a 'suggested' category:** three options — Activate, Deactivate, **Make Alias of** (search/dropdown of existing active categories → adds the suggested name to `category_aliases` pointing at the chosen target, marks the suggested row as deactivated).
- **Workflow:** local-first. Build and test locally, present migration SQL for review, deploy to VPS only after authorisation.

---

## 1. Migration: registration form fields on `providers`

- Drop `full_name`. Add `first_name` (text, not null) and `surname` (text, not null).
- Add `area_covered` (text, nullable). Free text input. Parsed downstream into tags: postcodes become individual tags; free text like "North London" or "London" passes through as a single tag; empty is allowed.
- Add `vat_number` (text, nullable)
- Add `companies_house_number` (text, nullable)
- Add `sole_trader_utr` (text, nullable)
- Add `years_in_business` (integer, nullable)
- Add `affiliations` (text, nullable — free text for now: organisational affiliations and credentials)
- Add `application_deadline` (timestamptz, nullable — set to NOW() + 72 hours on registration)
- Add `restart_count` (integer, default 0, max 2 enforced in app code)
- Add `application_expired` (boolean, default false)
- Add `admin_approved` (boolean, default false)
- Add `admin_approved_at` (timestamptz, nullable)

Migration also truncates `providers` and dependent tables (recommendations, profile_visits, outbound_messages, service_requests, admin_alerts) — fresh start, no production data to preserve.

Update all routes, jobs, and the enrichment prompt that referenced `full_name` to use `first_name` + `surname` (concatenate for display where needed).

## 2. Migration: category status and aliases

- Extend `category_status` enum to add `'suggested'` and `'deactivated'`. Existing `'pending_approval'` value: rename in code paths to `'suggested'` going forward; keep enum value present for safety. (Postgres enum value renaming is supported via `ALTER TYPE`.)
- Existing seed categories stay as `'active'`.
- New "Other" submissions create a category with status `'suggested'`.

New table `category_aliases`:
- `id` serial primary key
- `alias` text not null, unique, lowercased on insert (app-enforced)
- `category_id` integer references `service_categories_registry(id)` on delete cascade
- `created_at` timestamptz default now()

Seed `category_aliases` with at minimum the canonical subcategory name itself for every existing seed category, plus obvious variants — examples: `plumber`/`plumbing` → Plumber, `electrician`/`electrical` → Electrician, `lawyer`/`solicitor` → Solicitor/Lawyer, `accountant`/`accounting` → Accountant, `dog walker`/`dog walking` → Dog Walker. Aim for the most common trade-name variants on the seed list.

## 3. Category resolution utility

`resolveCategory(inputText)` in `server/src/services/categories.js`:
1. Lowercase + trim input
2. Look up `category_aliases` for an exact match
3. If found and the linked category is `active` → return `category_id`
4. If not found → create a new row in `service_categories_registry` with `status = 'suggested'`, return its id
5. Called during registration for each category the provider selects/types

## 4. Admin category endpoints

Under `/api/admin/*` (existing admin auth middleware):
- `PATCH /api/admin/categories/:id/status` — body `{ status: 'active' | 'deactivated' }`
- `POST /api/admin/categories/:id/aliases` — body `{ alias: string }`
- `DELETE /api/admin/categories/:id/aliases/:aliasId`
- `POST /api/admin/categories/:id/make-alias` — body `{ target_category_id: int }`. Adds the source category's name as an alias of `target_category_id`, marks source as `deactivated`. Used when reviewing 'suggested' categories.
- `GET /api/admin/categories` — returns all categories with status + associated aliases. Supports `?status=active` filter (used to populate the Make Alias dropdown).

## 5. Go-live rule change

Replaces existing rule (enrichment + 1 rec → live).

Provider goes live ONLY when **all three** are true:
- `enrichment_status = 'processed'`
- count of recommendations >= 3
- `admin_approved = true`

Behaviour:
- When 3rd recommendation arrives, create an `approval_ready` admin alert. Do NOT set `live_at`.
- `POST /api/admin/providers/:id/approve` — sets `admin_approved = true`, `admin_approved_at = now()`, sets `live_at = now()` if enrichment is also processed. Works regardless of recommendation count (admin override).

Extend `alert_type` enum: add `'approval_ready'`.

## 6. Application deadline + restart

- On registration: `application_deadline = NOW() + interval '72 hours'`
- Background check (extend existing alerts cron in `server/src/jobs/alerts.js`): for providers where `application_deadline < NOW()` AND `live_at IS NULL` AND `application_expired = false`:
  - If `restart_count < 2`: create `deadline_warning` alert, mark provider as deadline-expired (a flag, not destruction)
  - If `restart_count >= 2`: set `application_expired = true`, create `application_expired` alert
- `POST /api/providers/:slug/restart` — if `restart_count < 2` and not `application_expired`: increment `restart_count`, set new `application_deadline = NOW() + 72 hours`. Else 400 with reason.

Extend `alert_type` enum: add `'deadline_warning'`, `'application_expired'`.

## 7. New alert types and endpoints

Extend `alert_type` enum: add `'recommendation_complete'` (alias-purpose alert when 3rd rec arrives — may be the same as `approval_ready`; consolidate to one), `'provider_ping'`, `'contact_message'`.

- `POST /api/providers/:slug/ping-admin` — creates a `provider_ping` alert. Rate-limit: max 1 ping per 24 hours per provider (enforced via lookup on `admin_alerts`).
- `POST /api/contact` — body `{ name, email, phone, message, provider_slug? }`. Creates a `contact_message` alert visible on the admin alert board. Public endpoint, no auth.

## 8. LLM enrichment prompt update

Extend `server/src/jobs/enrichment.js` prompt to also emit alias suggestions:
- When the model identifies provider category terms that look like synonyms of existing categories, include them in a `suggested_aliases` array in the JSON response: `[{ alias: string, target_category_subcategory: string }]`.
- Persist these into a new field on `providers` (e.g. `parsed_alias_suggestions JSONB`) for admin to review and approve/reject in the admin UI. Do NOT auto-insert into `category_aliases`.

## 9. Constraints

- All new admin endpoints under `/api/admin/*` must use the existing admin auth middleware.
- Preserve raw form inputs alongside any parsed/enriched fields (existing design principle).
- Migrations must run cleanly on a fresh database AND against the wiped existing schema.
- Local-first build: present migration SQL for review before any prod deployment.
