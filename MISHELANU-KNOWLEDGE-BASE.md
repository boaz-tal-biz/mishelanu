# Mishelanu — Project Knowledge Base

**Last updated:** 18 April 2026
**Purpose:** Carry-forward context document for continuing development in new conversations.

---

## 1. What Mishelanu Is

A community trust network for Jewish/Israeli communities in the UK. Service providers register, get LLM-enriched profiles, collect community recommendations, and go live after admin approval. A monitor tool matches incoming WhatsApp service requests (simulated for MVP) to registered providers.

**Naming rule:** Always write "Mishelanu" in English transliteration. Never use Hebrew in UI, copy, or documentation. The logo image contains the Hebrew wordmark but is rendered as an image file, not text.

---

## 2. Tech Stack

- **Frontend:** React + Vite (single repo, mobile-first)
- **Backend:** Node.js + Express
- **Database:** PostgreSQL 16
- **LLM:** Claude API (Sonnet) — parses service requests, enriches provider profiles
- **Hosting:** Docker Compose (Node + Postgres)
- **WhatsApp:** Simulated only for MVP

---

## 3. Infrastructure and Deployment

| | Local | Production |
|---|---|---|
| Path | `~/mishelanu` | `/opt/mishelanu/` |
| Server | localhost:3001 | srv1421683.hstgr.cloud |
| SSH | n/a | `ssh hostinger` (key: `~/.ssh/hostinger_vps`) |
| Deploy | `npm run dev` | `docker compose up --build -d` |
| Node env | development | production |
| DB host | localhost | postgres (Docker network) |

**GitHub:** `github.com/boaz-tal-biz/mishelanu`

**Redeploy workflow:** Push to GitHub, SSH into server, `cd /opt/mishelanu && git pull && docker compose up --build -d`

**Important files:**
- `.env` — secrets, never committed to git. Exists separately on local and production.
- `CLAUDE.md` — original technical scaffold and build progress
- `PROJECT-CONTEXT.md` — product decisions and build plan (committed to repo)
- `MISHELANU-KNOWLEDGE-BASE.md` — comprehensive carry-forward context (this file)

---

## 4. Brand and Design

- **Logo:** Circular navy badge with teal M icon. Three sizes at `client/public/assets/`: sm (80px), md (200px), full (1024px). Header shows logo image + "Mishelanu" text in white.
- **Colours:** Navy `#1a2744`, Teal `#3eb8a4`, Coral `#e85a4f`, Cream `#f8f9fa`
- **Style:** Mobile-first, clean, minimal
- **Fonts:** Must render Hebrew well
- **Tone (for recommendations/community copy):** Warm, Jewish community spirit. "A mitzvah, not a form." Light humour. Terms like Mazal tov, Kol hakavod, Mensch, L'chaim.

---

## 5. Registration Form (Complete Field List)

| Field | Type | Required |
|---|---|---|
| First name | text | Yes |
| Surname | text | Yes |
| Area covered | text | Yes |
| Phone | text | Yes |
| Email | text | Yes |
| Description of services | textarea | Yes |
| Categories | tag/chip input with typeahead | Yes |
| Years in business | number | No |
| UK VAT number | text | No |
| Companies House registration number | text | No |
| Sole trader UTR | text | No |
| Payment types accepted | checkbox: Cash, Card, Bank Transfer, Other (free text) | No |
| Size of business | radio: Small (1-2), Medium (up to 5), Large (5+), Other (free text) | No |
| Affiliations and credentials | textarea | No |

**Category input:** Comma or Enter creates a chip. Typeahead suggests active categories. Unknown entries create "suggested" categories for admin review.

**Contact Us:** Button at bottom of registration page opens form (name, email, phone optional, message). Submits to `POST /api/contact`.

---

## 6. Category System

**Status lifecycle:** `suggested` then `active` then `deactivated`

**Alias resolution:** `category_aliases` table maps variants to canonical categories (e.g. "plumber" maps to "Plumbing"). `resolveCategory()` checks aliases at registration. LLM enrichment also suggests aliases.

**Admin management:** Categories tab in Admin Dashboard (not Monitor view). Table with status badges, provider counts, aliases, and action buttons.

---

## 7. Provider Lifecycle

### Go-Live Conditions (all three required)
1. LLM enrichment processed
2. At least 3 community recommendations received
3. Explicit admin approval

Admin can override and approve with fewer than 3 recommendations.

### Registration Deadline
- 72 hours from registration to collect 3 recommendations
- Can restart clock without re-entering details (max 2 restarts)
- After 2 failed restarts: application expires permanently, must re-register

### Application Status Stages
1. **Registered** — form submitted, enrichment queued
2. **Recommendations** — collecting (X of 3)
3. **Admin Review** — 3 recommendations received, pending approval
4. **Live** — admin approved, profile public

### Provider Self-Service (Management View)
- Auth via `management_token` (UUID, separate from recommendation token)
- Access URL: `/provider/:slug?token=:managementToken`
- Shows: 4-stage progress bar, profile link, recommendation link, countdown timer, restart button, ping admin button
- No provider accounts — token URL is the sole auth mechanism

---

## 8. Recommendation System

### Recommendation Page Flow (`/recommend/:token`)
1. **Intro** — who Mishelanu is, 48-hour urgency prompt, community spirit tone
2. **Confirmation gate** — "Do you know [Provider Name]?" Yes/No
3. **Relationship type** (radio): personal_work, personal_known, personal_both, hearsay
4. **Recommender details** (all required): first name, surname, email, phone + privacy notice
5. **Recommendation details** (conditional on relationship type): how long known (always), last service date (personal_work/both only), service description (personal_work/both/known), "what have you heard?" (hearsay only)
6. **Optional opt-in** — two checkboxes: join as provider, join as user
7. **Submit** — thank-you message

### Hearsay Recommendations
- Count toward the 3-recommendation threshold
- Flagged to admin with breakdown: "3 recommendations (2 personal, 1 hearsay)"
- Service date/type fields hidden

### Recommender Data Scrub
Triggered automatically when admin approves the provider or when application expires permanently.

Scrub deletes: email, phone, surname. Retained: first name, timestamp, relationship type, recommendation content. Scrub event logged for audit.

Opt-in alerts created at submission time (before any scrub).

---

## 9. Admin System

### Three Roles

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

### Implementation
- Admin users table in Postgres, bcrypt passwords, JWT sessions, role column
- Super admin seeded from env vars
- JWT token stored in React state (NOT localStorage)
- Token expiry: 24 hours

### Monitor Role (Detailed)
Monitors have full execute access on the monitor tool only: parse WhatsApp message, choose provider, send messages. Zero access to everything else.

### Super Admin Credentials
- Local and production: boaz@tal.biz
- Password set in `.env` on each machine

---

## 10. Alert System

### Alert Tiers
- **Action required** (coral) — needs admin response
- **Informational** (teal) — awareness, no action needed
- **System log** (grey) — audit trail

### Alert Types (30+ types across 6 categories)

Provider lifecycle: new_registration, registration_expiring_48h, registration_expiring_12h, registration_expired, registration_restarted, registration_permanently_expired, provider_ping, enrichment_completed, enrichment_failed

Recommendations: recommendation_received, approval_ready, hearsay_recommendation

Post-approval: provider_live, low_recommendation_warning, renewal_approaching, renewal_payment_received (future), renewal_overdue (future)

Categories: category_suggested, alias_suggested

Inbound contact: contact_message, opt_in_provider, opt_in_user, requester_contact

Monitor activity: request_parsed, match_sent, provider_accepted, provider_declined, requester_notified

System: admin_user_created, admin_user_role_changed, provider_suspended, provider_reactivated, provider_deleted

### Alert Board UI
- Three tier filter tabs with counts
- Type/date/provider filters
- Inline action buttons (approve, dismiss, retry)
- Bulk read/resolve
- Badge count in navigation (polling every 60s)
- Deduplication: same type + same provider + unresolved means update existing, don't create new

---

## 11. Legal Pages

- **Privacy Policy** (`/privacy`) — data collection, LLM processing, recommender scrub commitment, no data sold
- **Terms and Conditions** (`/terms`) — matching service not guarantee, community vetting, admin removal rights, 72-hour deadline
- **Disclaimer** (`/disclaimer`) — no warranty, introductions only, not liable for outcomes
- **Contact** (`/contact`) — form + boaz@bless.network displayed
- All linked from site footer (navy background, every page)

---

## 12. Build Sequence and Status

| Prompt | Scope | Status |
|---|---|---|
| 1 | Backend and data model | Deployed, tested |
| 2 | Frontend — logo, registration, management view, categories tab, alert board | Deployed, tested |
| 3 | Recommendation system — backend + frontend | Deployed, tested |
| Logo fix | Replace Magen David with logo image, remove Hebrew text | Deployed |
| 4 | Admin multi-user auth with roles | Written, handed to Claude Code |
| 5 | Legal pages, contact page, site footer | Written, handed to Claude Code |
| 6 | Comprehensive alert system — all types, tiering, filters | Written, handed to Claude Code |
| 7 | Recognition and feedback system | Not yet written — design post-core |

### Smoke Tests
- Prompts 1-3: 6 tests (automated script at `server/src/tests/smoke-test.js` + 2 manual checks). All passed.
- Prompts 4-6: 13 tests (automated script at `server/src/tests/smoke-test-p456.js` + 5 manual checks). Pending.

---

## 13. Future Features (Noted, Not Building)

### Requester Onboarding Layer
When a requester opts in, they add Mishelanu on WhatsApp and send requests directly. System auto-matches from approved providers, bypassing the manual monitor. Target: ~200 providers. Requires real WhatsApp integration.

### Payment/Renewal System
Provider renewal payments. Design TBD — payment provider, pricing, flow. Homepage should have a placeholder path.

### Recognition and Feedback System (Prompt 7)
Provider of the Month, Mensch of the Month. Milestone badges with Jewish flavour. Monthly summaries. Post-match feedback nudge as informal rating system.

---

## 14. Key Design Principles

1. Raw inputs always preserved alongside LLM-enriched fields
2. No provider accounts — management_token URL is the auth mechanism
3. Recommender privacy — contact details scrubbed on approval/expiry, commitment in privacy policy
4. Category deduplication — alias system prevents taxonomy fragmentation
5. Admin as gatekeeper — no auto-live, explicit approval required
6. Alert resilience — if alert creation fails, primary action (registration, recommendation) still succeeds
7. Mobile-first — all interfaces designed for mobile first

---

## 15. Working with Claude Code

- Use `claude --dangerously-skip-permissions` to run hands-free (no approval prompts). Flag set at launch, cannot toggle mid-session.
- Claude Code reads `CLAUDE.md` and `PROJECT-CONTEXT.md` from repo root for context.
- Prompts should be self-contained with all context needed.
- Large changes split into separate prompts (backend first, then frontend).
- Always include a smoke test prompt after a batch of changes.

---

## 16. Open Brain

Mishelanu is registered as a project in Open Brain with 10+ captured thoughts covering: project overview, go-live conditions, registration deadlines, management tokens, data scrub commitments, category taxonomy, admin roles, registration fields, deployment infrastructure, branding rules, and build status. Search `project:mishelanu` in Open Brain for the full set.
