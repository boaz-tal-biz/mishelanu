# Mishelanu — Build Notes

## ▶ Latest: Recommendation system redesign, 2026-04-18

**Status:** built, smoke-tested locally, committed, pushed, **deploy in progress this turn**.
**Spec:** "Mishelanu — Recommendation System Redesign" (in chat).

### What shipped

- **Migration 008** — extends `recommendations` with `recommender_first_name`, `recommender_surname`, `recommender_phone`, `relationship_type` (CHECK-constrained to `personal_work|personal_known|personal_both|hearsay`), `how_long_known`, `last_service_date`, `service_description`, `opt_in_provider`, `opt_in_user`, `details_scrubbed`. Backfills `first_name`/`surname` from old `recommender_name`, maps the legacy `relationship` enum into the new `relationship_type`, copies `recommendation_text` into `service_description`. Old columns retained (raw-data preservation). Adds `opt_in_interest` to `alert_type`. Creates `recommendation_scrub_log` with CHECK on `triggered_by` (`admin_approval | application_expired | manual`).
- **Migration 009** — relaxes NOT NULL on `recommender_name` and `recommender_surname` so the scrub routine can null them per spec. API still enforces NOT NULL on new submissions.
- **`scrubRecommenderDetails(providerId, triggeredBy)`** — new service in `server/src/services/recommendations.js`. Nulls `recommender_email`, `recommender_phone`, `recommender_surname`, plus the legacy `recommender_name` and (legacy) `recommender_email`; sets `details_scrubbed = true`; writes a `recommendation_scrub_log` row; logs to console. Idempotent on already-scrubbed rows.
- **Auto-scrub triggers** — wired into `POST /api/admin/providers/:id/approve` (after admin_approved + live_at update) and into `checkApplicationDeadlines` job (when `application_expired` flips true). Both wrapped in try/catch so the parent operation succeeds even if scrub fails (logged).
- **`POST /api/recommendations/:token` rewritten** — accepts the new fields, validates `relationship_type` against the whitelist, requires `service_description` only for personal experience types, fires an `opt_in_interest` admin alert (with full contact metadata) BEFORE any later scrub touches the row, still creates the `approval_ready` alert at the 3rd recommendation. Writes BOTH new and legacy columns so legacy admin views and exports keep working.
- **`GET /api/recommendations/:token`** — now returns `provider_first_name` and `provider_surname` so the recommender page can address the provider personally.
- **`GET /api/admin/providers/:id`** — selects the new recommendation columns and adds a `recommendations_summary` block with totals by relationship type plus a human-readable text ("3 recommendations (2 personal, 1 hearsay)").
- **AdminProvider page** — recommendation list now shows the recommender's first name + surname (or "Anonymous" for legacy), a relationship badge, a "Scrubbed" badge when applicable, an "Opt-in" badge when the recommender opted in, the new `service_description` body, optional how-long-known and last-service-date lines, and contact details only when not yet scrubbed.
- **Recommend page (`/recommend/:token`)** — full rewrite. Cream intro card with the spec's body copy (provider's first name interpolated). "Do you know them?" confirmation gate. Four-option relationship radio with selected-state highlighting. Required first/surname/email/phone block with the privacy notice in a teal-accent cream card. Conditional "tell us about your experience" section: how-long-known always visible; last-service-date only for `personal_work` / `personal_both`; service-description label/placeholder switches between "What service did they provide?" (personal_work / personal_both — required) and "What service did they provide?" (personal_known — optional) and "What have you heard about their work?" (hearsay — optional). Two opt-in checkboxes. Thank-you state with the threshold-reached banner if this was the 3rd recommendation.

### Smoke tests run (local)

- Migrations 008 + 009 applied cleanly.
- End-to-end: register → 3 recommendations submitted (one each of `personal_work`, `hearsay`, `personal_known` + opt-in) → approval_ready alert fires at the 3rd → opt_in_interest alert created with full contact metadata → admin approve returns `recommendations_scrubbed: 3` → re-fetch shows `recommender_email`/`phone`/`surname`/legacy `recommender_name` all null and `details_scrubbed = true` → `recommendation_scrub_log` row exists with `triggered_by = admin_approval`.
- Validation paths: missing/invalid `relationship_type` → 400; `personal_work` without `service_description` → 400; missing email/phone → 400; `hearsay` without `service_description` → 201.

### Judgement calls

14. **`recommender_email` and `recommender_phone` stay nullable in the DB schema** — spec calls them NOT NULL, but legacy rows have no phone (and possibly no email), and post-scrub rows must have null. Resolution: API enforces NOT NULL on new submissions; the schema stays permissive. The new validation is unambiguous because every new write goes through the route layer.
15. **Old columns retained (raw-data preservation), populated alongside new ones** — `recommender_name` and `recommender_email` (legacy) are still written by every new submission and read by legacy code paths until they're explicitly removed. Scrub also nulls these so the post-approval state is uniformly contact-free.
16. **Legacy `relationship` enum populated by mapping the new `relationship_type`** — `personal_work`/`personal_both` → `Client`, `personal_known` → `Friend/Family`, `hearsay` → `Community member`. Best-effort fit; means any old report querying the enum still gets a sensible value.
17. **`service_description` required only for `personal_work` and `personal_both`** — spec text said "If `relationship_type` starts with 'personal_', require `service_description` to be non-empty" but the `personal_known` flow shows the field as optional ("show 'What service did they provide?' but not 'When did you last use their services?'"). Took the conservative read: require the field when the recommender claims to have personally received a service. For pure `personal_known` (knows them but didn't engage them), it's optional. Documented for review.
18. **Migration 009 added separately rather than amending 008** — preserves migration history. 008 was already applied to my local DB by the time I noticed the NOT NULL constraint blocked the scrub. 009 is a one-line fix; safer than dropping and re-running 008.
19. **`opt_in_interest` alert metadata snapshot** — captures recommender's name, email, phone, opt-in flags, and provider context at recommendation time. So even after the recommendation row is scrubbed, the alert still has everything admin needs to follow up.
20. **Scrub does NOT delete `recommendation_scrub_log` rows** — they're audit. They survive provider deletion only via the `ON DELETE CASCADE` foreign key on `provider_id` (intentional: deleting the provider removes their entire footprint).
21. **Admin approve still 200s if scrub fails** — wrapped in try/catch with console.error. Reasoning: the approval is the user-facing action; if scrub fails, an admin should still see the provider as approved and the failure should be visible in logs for follow-up. Not silently swallowed — errors print.

### Files touched

- `server/src/db/migrations/008_recommendation_redesign.sql` (new)
- `server/src/db/migrations/009_relax_recommender_name_columns.sql` (new)
- `server/src/services/recommendations.js` (new)
- `server/src/routes/recommendations.js` (rewrite)
- `server/src/routes/admin.js` (approve route + provider detail)
- `server/src/jobs/alerts.js` (deadline expiry triggers scrub)
- `client/src/pages/Recommend.jsx` (full rewrite)
- `client/src/pages/AdminProvider.jsx` (new recommendation display)

---

## Earlier: Frontend tranche, overnight 2026-04-17 → 2026-04-18

**Status:** built, smoke-tested locally, committed, pushed. **Deployed to VPS 2026-04-18 09:03 UTC.**
**Commit:** `1fc0c27` on `main` (GitHub).
**Prod bundle:** `/assets/index-CN-dQZwo.js` (hash matches local build → reproducible).

### Morning checklist for Boaz

1. The frontend tranche is now live on http://187.77.179.106:3001 — register a fake provider to eyeball the new flow.
2. Smoke test on prod after deploy: `/manage` returns `recommendations` + `parsed_profile` + `payment_types` + `business_size`; admin `/categories` returns `provider_count` + aliases; PATCH category status works; bundle hash matches local build.
3. Test cleanup left prod with 0 providers (same as before).

### What shipped

- **Header logo** — Magen David icon and English "Mishelanu" text replaced with the Hebrew wordmark משלנו. Linked to `/`, aria-label "Mishelanu home".
- **Register page** — added Payments Accepted (multi-checkbox + "other" text), Size of Business (radio + "other" text), full required-when-other validation. Renamed labels to spec ("Area Covered", "Years in Business", "UK VAT Number", "Companies House Registration Number", "Sole Trader UTR", section heading "Business Credentials"). Category chip input now accepts Enter or comma; unmatched text becomes a chip directly (no separate "Other" suggestion path). On successful registration the page redirects to `/provider/:slug?token=:management_token` instead of showing an inline result. Added an inline Contact Mishelanu form at the bottom that POSTs to `/api/contact`.
- **Profile page** — full rewrite. `?token=` query param triggers `GET /api/providers/:slug/manage`. If valid → management view; if invalid → strip token from URL and fall back to public profile. Management view: status banner, four-stage horizontal progress bar (Registered, Recommendations X/3, Admin Review, Live), copy buttons for the public profile + recommendation links, live-updating countdown (switches to coral inside the last 12 hours), Restart Application button when the window has lapsed and `restart_count < 2`, "application expired" notice with a contact link when restarts are exhausted, Ping Admin button (3 recs + admin not approved, persisted as 24-hour disable via `localStorage`). Once live, banner becomes a "Your profile is live" success card with the public URL + copy button, and the public profile body renders below.
- **Admin Dashboard** — Categories tab rebuilt: status badges (suggested = amber, active = green, deactivated = grey), provider count, alias chips with X-to-remove, "Add alias" inline input on Enter, action buttons (Approve/Reject for suggested, Deactivate for active, Reactivate for deactivated), search and status filter. Alert board extended for `approval_ready` (with one-click Approve action that approves the provider and dismisses the alert), `provider_ping` (with View provider link), `contact_message` (renders sender name/email/phone/message + provider slug link, dismiss only), and `application_expired` (with View provider link). Type-specific badge colours.
- **Backend tweaks needed by the new client:**
  - `GET /api/providers/:slug/manage` now also returns `parsed_profile`, `recommendations` array, `verified` flag, and `full_name`.
  - `GET /api/admin/categories` now returns `provider_count` for each row.

### Judgement calls (overnight)

6. **Logo colour** — spec said "use the brand navy (#1a2744) as the text colour" but the existing Header has a navy background, so navy text on navy bg would be invisible. Rendered the wordmark in white (matching the existing brand text colour for the navy header) and used `font-family: Rubik, Heebo, system-ui` to favour Hebrew-friendly fonts already loaded by the project. If the intent was a light header redesign, easy follow-up.
7. **Category chip input UX** — kept the typeahead dropdown but removed the separate "Other" suggestion chip flow. Per spec, unmatched text becomes a regular chip in `service_categories` and goes through the backend's `resolveCategory` flow (which auto-creates with status `suggested`). One unified chip appearance, one storage path.
8. **Management view, live state** — spec says "render the full public profile below" once live. To avoid double API calls, extended `/manage` to return everything the public endpoint returns. Single fetch, single source of truth.
9. **Ping Admin 24h disable** — backend enforces 1/24h (returns 429). Client persists `last ping at` in `localStorage` keyed by slug so the disabled state survives a page reload. If the user clears storage, the backend's 429 also flips the UI to the disabled state.
10. **Categories tab `pending_approval` legacy value** — the enum still has the old `pending_approval` value alongside the new `suggested`. The Categories UI treats both as "Suggested" so any legacy rows render correctly without a data migration.
11. **Approve action on `approval_ready` alert** — the backend's `POST /admin/providers/:id/approve` does not auto-dismiss the triggering alert. The client now performs both calls (approve, then dismiss alert) as a single user action so the alert disappears from the inbox.
12. **PATCH not in api helper** — `useApi.js` only exposes `get/post/put/del`. Rather than touch the helper, added a tiny local `fetchPatch` for the one PATCH call (`/admin/categories/:id/status`). Smaller diff, no impact elsewhere.
13. **CategoriesTab provider_count query** — the providers table stores raw user-entered category strings (preserved-input design), so the count uses both the canonical `subcategory` and the `Category: Subcategory` form to catch both shapes that registration produces.

### Smoke tests run

- `npm run build` (Vite) — passes, 39 modules transformed, no warnings.
- Backend boot (PORT=3099) + curl checks for: management endpoint returning recommendations + parsed_profile + full_name; admin/categories returning provider_count + aliases; POST / PATCH / DELETE on category aliases + status; public contact form; restart and ping-admin token-gated endpoints. All green. Test data cleaned up.

### Not done (and not in scope for tonight)

- VPS deploy — per standing rules I stop at "tested locally + committed + pushed".
- Real browser click-through of the chip input, progress bar, countdown timer, etc. Vite build is clean and the smoke tests cover the API surface, but the visual interactions have not been clicked through.
- Tonight's earlier note: backend was already deployed last night (commit `9532dfc`); only the JS for the new UI needs deploying now. No new migrations.

### Files touched

- `client/src/components/Header.jsx`
- `client/src/pages/Register.jsx`
- `client/src/pages/Profile.jsx`
- `client/src/pages/AdminDashboard.jsx`
- `server/src/routes/providers.js` (extended `/manage` response)
- `server/src/routes/admin.js` (provider_count in `/admin/categories`)

---

## Earlier: Backend extension session, 2026-04-17

**Spec:** `phase1-backend-extension.md`
**Mandate:** proceed through all remaining build tasks without check-ins; document judgement calls here; stop at Task 13 for review.

### Judgement calls — backend (running log)

#### Migrations (Tasks 1–3)

1. **TRUNCATE → ordered DELETEs** — original migration 004 used `TRUNCATE ... CASCADE` on `providers`. Caught in local test: cascaded into `service_categories_registry` (nullable FK) and wiped the 31 seed categories, leaving alias seed with nothing to JOIN. Rewrote as ordered `DELETE`s + null-out of `suggested_by_provider_id`. Categories preserved.
2. **`pending_approval` enum value retained** — current `category_status` enum has `'pending_approval'` (unused). Per spec, new code routes through `'suggested'`. Kept the old enum value in place; dropping it would require a type recreation and is unsafe against any stray reference. `IF NOT EXISTS` makes re-runs idempotent.
3. **Consolidated `recommendation_complete` into `approval_ready`** — brief mentioned both but they fire at the same moment. Single alert avoids duplicate inbox entries. Flagged in chat, confirmed by silence.
4. **Seed aliases count** — 79 aliases across 31 categories, averaging 2–3 per category. Covers canonical name, common plural/verb forms, and obvious synonyms (lawyer → solicitor/lawyer, physio → physiotherapist). Not exhaustive — admin can add more via endpoint.
5. **CHECK constraint on `restart_count`** — spec said "max 2 enforced in app code". Also added a DB-level CHECK (0–2) as belt-and-braces. Cheap to enforce twice; prevents manual SQL mistakes later.
