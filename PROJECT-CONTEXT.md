# Mishelanu — Project Context & Product Decisions

Last updated: 2026-04-17

This document captures all product decisions, UX flows, data model changes, and build sequencing agreed during design sessions. It is the single source of truth for what is being built and why. CLAUDE.md covers the original technical scaffold; this document covers everything layered on top.

**Naming convention:** Always write "Mishelanu" in English transliteration. The only exception is the logo itself, which is the Hebrew wordmark משלנו.

---

## Product Summary

Community trust network for Jewish/Israeli communities in the UK. Service providers register, get LLM-enriched profiles, collect community recommendations, and go live after admin approval. A monitor tool matches incoming WhatsApp service requests (simulated for MVP) to registered providers.

---

## Brand

- Logo: **משלנו** as a text wordmark (navy #1a2744). No icon. Replaces the Magen David.
- Colours: Navy `#1a2744`, Teal `#3eb8a4`, Coral `#e85a4f`, Cream `#f8f9fa`
- Mobile-first, clean, minimal
- Fonts that render Hebrew well

---

## Registration Form

### Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| First name | text | Yes | Split from original single "name" field |
| Surname | text | Yes | |
| Area covered | text | Yes | Replaces "Where are you based?" — e.g. "North London, Hertfordshire" |
| Phone | text | Yes | |
| Email | text | Yes | |
| Description of services | textarea | Yes | Raw input preserved alongside LLM-enriched version |
| Categories | tag/chip input | Yes | Comma or Enter creates a new chip. Typeahead from active categories. Unknown entries go through "suggested" flow |
| Years in business | number | No | |
| UK VAT number | text | No | |
| Companies House registration number | text | No | |
| Sole trader UTR | text | No | Unique tax reference for sole traders |
| Payment types accepted | checkbox group | No | Options: Cash, Card, Bank Transfer, Other (with free text). Multiple selection. |
| Size of business | radio group | No | Options: Small (1–2 people), Medium (up to 5 people), Large (5+ people), Other (with free text). Single selection. |
| Affiliations & credentials | textarea | No | e.g. "Federation of Master Builders, Gas Safe registered" |

### Contact Us

A "Contact Us" button at the bottom of the registration page opens a form (name, email, phone optional, message). Submits to `POST /api/contact`. Creates an alert on the admin board.

---

## Category System

### Status Lifecycle

`suggested` → `active` → `deactivated`

- Seed categories are `active`
- New categories from registration "Other" flow are created as `suggested`
- Admin can activate, deactivate, or reactivate

### Alias Resolution

A `category_aliases` table maps variant terms to canonical categories:
- "plumber", "plumbing", "plumbing services" → canonical "Plumbing"
- `resolveCategory(inputText)` checks aliases on registration
- LLM enrichment also suggests alias mappings for admin review
- Each canonical category name is seeded as its own alias

### Admin Category Management

Located in the Admin Dashboard (not the Monitor view). Table showing all categories with status, provider count, aliases, and action buttons (approve/reject/activate/deactivate). Inline alias management.

---

## Provider Lifecycle (Revised)

### Go-Live Conditions

A provider goes live ONLY when ALL three conditions are met:
1. LLM enrichment processed
2. At least 3 community recommendations received
3. Explicit admin approval

**Admin can override** and approve with fewer than 3 recommendations.

This replaces the previous auto-live logic (enrichment + 1 recommendation).

### Registration Deadline

- 72 hours from registration to collect 3 recommendations
- If deadline passes: provider can restart the clock without re-entering details
- Maximum 2 restarts. After 2 failed restarts, application expires permanently — must re-register from scratch
- At 48h and 12h remaining: admin alerts for nearing expiry

### Application Status Stages

1. **Registered** — form submitted, enrichment queued
2. **Recommendations** — collecting (X of 3)
3. **Admin Review** — 3 recommendations received, pending admin approval
4. **Live** — admin approved, profile public

### Provider Self-Service (Management View)

Each provider gets a `management_token` (UUID) at registration, separate from the recommendation token. The provider accesses their management view via `/provider/:slug?token=:managementToken`.

The management view shows:
- 4-stage progress bar (Registered → Recommendations → Admin Review → Live)
- Profile link with copy button
- Recommendation link with copy button + "Share this link, you need 3 recommendations within 72 hours"
- Countdown timer (coral warning under 12 hours)
- Restart button (if deadline passed, restarts < 2)
- Ping Admin button (if 3 recs received, awaiting review; rate-limited to 1 per 24h)
- "Bookmark this page" note
- Once live: success message + full public profile

No provider accounts exist. The management_token URL is the sole auth mechanism.

---

## Recommendation System

### Recommendation Page (`/recommend/:token`)

**Tone:** Community warmth, Jewish spirit. A mitzvah, not a form. Light touch of humour.

**Flow:**

1. **Introduction** — who Mishelanu is, why the recommendation matters, 48-hour urgency prompt, thanks from the provider and from Mishelanu

2. **Confirmation gate** — "Do you know [Provider Name]?" Yes → continue. No → polite exit message.

3. **Relationship type** (radio, required):
   - "They did work for me" → `personal_work`
   - "I know them personally" → `personal_known`
   - "Both" → `personal_both`
   - "I've heard about them from others" → `hearsay`

4. **Recommender details** (all required):
   - First name, surname, email, phone
   - Privacy notice: details used only for verification, scrubbed after provider approval or application expiry. Only first name and recommendation content retained.

5. **Recommendation details** (conditional on relationship type):
   - How long known (free text, always shown)
   - Last service date (free text, shown for `personal_work` and `personal_both` only)
   - Service description (free text, shown for `personal_work`, `personal_both`, `personal_known`)
   - For `hearsay`: "What have you heard about their work?" replaces service fields

6. **Optional opt-in** (two independent checkboxes, neither mandatory):
   - "I'd like to register as a service provider on Mishelanu"
   - "I'd like to learn more about joining Mishelanu as a user"

7. **Submit** → thank-you message. If this was the 3rd recommendation, add note that the profile is being reviewed.

### Recommender Data Scrub

Triggered automatically in two cases:
- Admin approves the provider
- Provider's application expires permanently

Scrub deletes: email, phone, surname from all associated recommendations.
Retained: first name, timestamp, relationship type, all recommendation content.
Scrub event is logged (provider_id, timestamp, count) for audit.

Opt-in alerts (recommender wants to be a provider/user) are created at recommendation submission time — before any scrub could occur.

### Hearsay Recommendations

- Count toward the 3-recommendation threshold
- Flagged to admin: summary shows "3 recommendations (2 personal, 1 hearsay)"
- Service date and service type fields are hidden for hearsay

---

## Admin System

### Multi-User Auth (Prompt 4 — not yet built)

Three roles:

| Permission | Super Admin | Admin | Monitor |
|---|---|---|---|
| Manage admin users | Yes | No | No |
| Approve providers | Yes | Yes | No |
| Manage categories | Yes | Yes | No |
| View/action all alerts | Yes | Yes | No |
| Monitor tool (parse, match, send) | Yes | Yes | Yes |
| System settings | Yes | No | No |
| View dashboards/reports | Yes | Yes | No |
| Export data | Yes | Yes | No |

Implementation: Admin users table in Postgres, hashed passwords, JWT sessions, role column. Super admin seeded from env vars. No external auth provider — easy to migrate later.

### Monitor Role

Monitors have full execute access on the monitor tool:
1. Parse incoming WhatsApp message
2. Choose a matching provider
3. Send messages to provider and requester

Zero access to everything else.

---

## Alert System

### Alert Types (comprehensive list)

**Provider lifecycle:**
- New registration received
- Registration nearing 72-hour expiry (at 48h and 12h remaining)
- Registration expired (restarts available)
- Registration restarted (with restart count)
- Registration permanently expired (max restarts hit)
- Provider pinged admin for approval
- LLM enrichment completed
- LLM enrichment failed

**Recommendations:**
- New recommendation received (with running count: "2 of 3")
- 3rd recommendation received — provider ready for admin review
- Hearsay recommendation flagged

**Post-approval:**
- Provider went live (confirmation)
- Provider approaching 30-day low-recommendation warning
- Provider approaching 11-month renewal
- Provider renewal payment received (future)
- Provider renewal overdue (future)

**Categories:**
- New category suggested
- LLM alias suggestion for review

**Inbound contact:**
- Contact form message
- Recommender opted in as provider interest
- Recommender opted in as user interest
- Requester contacted us

**Monitor activity:**
- New service request parsed
- Match sent to provider
- Provider responded YES
- Provider responded NO / timeout
- Requester notified with profile link

**System:**
- Admin user created
- Admin user role changed
- Provider manually suspended/reactivated/deleted by admin

### Alert Tiers (UI)

- **Action required** (coral) — needs admin response
- **Informational** (teal) — awareness, no action needed
- **System log** (grey) — audit trail

Filterable by tier, type, and date.

---

## Legal Pages (Prompt 5 — not yet built)

- Privacy Policy — covers provider data, recommender data scrub commitment, LLM processing, no data sold
- Terms & Conditions — Mishelanu as matching service, community-based vetting, admin right to remove providers, registration deadlines
- Disclaimer / Limitation of Liability — no warranty on provider quality, facilitates introductions only
- Contact page — form + displayed email address

All linked from site footer on every page. Draft content generated for prototype, lawyer review before going live.

---

## Public Website

Homepage serves as landing page. Includes:
- Provider registration entry point
- Renewal payment path (future, placeholder for now)
- Contact us form
- Footer with links to Terms, Privacy, Disclaimer, Contact

---

## Recognition & Feedback System (Prompt 7 — not yet built)

Two tracks with Jewish community flavour:

**Provider recognition:**
- Provider of the Month — based on recommendation count, response rate, positive matches
- Milestone badges: "Community Verified" (3 recs), "Community Favourite" (10 recs), "Mazal Tov — 1 Year on Mishelanu"
- Monthly summary: "You helped X people this month. Kol hakavod!"

**User/requester recognition:**
- "Mensch of the Month" — most active recommender or requester
- Post-match feedback nudge (doubles as informal rating system)

**Terms:** Mazal tov, Kol hakavod, Mensch, Baal HaBayit, L'chaim — Jewish, fun, communal.

---

## Future Features (Noted, Not Building)

### Requester Onboarding Layer
When a requester opts in, they add Mishelanu on WhatsApp and can send service requests directly. System bypasses manual monitor and auto-matches from approved providers. Target trigger: ~200 registered providers. Requires real WhatsApp integration.

### Payment/Renewal System
Provider renewal payments. Design TBD — payment provider, pricing, flow.

---

## Build Sequence

| Prompt | Scope | Status |
|---|---|---|
| 1 | Backend & data model (schema, endpoints, go-live logic, deadline/restart, management token, category aliases) | Written, running |
| 2 | Frontend — logo, registration form, management view, categories tab, alert board | Written, queued |
| 3 | Recommendation system — backend (scrub, opt-in, fields) + frontend (full redesign) | Written, queued |
| 4 | Admin multi-user auth with roles | To be written after 1-3 tested |
| 5 | Legal pages, contact page, site footer | To be written after 1-3 tested |
| 6 | Comprehensive alert system — all types, tiering, filters | To be written after 1-4 tested |
| 7 | Recognition & feedback system | To be written after core system stable |
