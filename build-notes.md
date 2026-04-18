# Mishelanu — Build Notes

## ▶ Latest: Frontend tranche, overnight 2026-04-17 → 2026-04-18

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
