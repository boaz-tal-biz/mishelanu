# Mishelanu — Service Provider Registry & Community Matching System

## What This Is
Community trust network for Jewish/Israeli communities in the UK. Providers register, get LLM-enriched profiles, collect recommendations, and go live. A monitor tool matches incoming service requests (from WhatsApp groups) to registered providers. WhatsApp is simulated for MVP.

## Tech Stack
- **Frontend**: React (single repo, mobile-first)
- **Backend**: Node.js + Express
- **Database**: PostgreSQL 16
- **LLM**: Claude API (Sonnet) — parses service requests, enriches provider profiles
- **Hosting**: Docker Compose (Node + Postgres)
- **WhatsApp**: Simulated only for MVP

## Brand
- Navy `#1a2744`, Teal `#3eb8a4`, Coral `#e85a4f`, Cream `#f8f9fa`
- Mobile-first, clean, minimal
- Fonts that render Hebrew well

## Project Structure
```
mishelanu/
├── server/           # Express API (port 3001)
│   └── src/
│       ├── index.js  # Main app + cron job scheduling
│       ├── db/       # pool, migrations (001-003)
│       ├── middleware/  # auth.js, errorHandler.js
│       ├── routes/   # providers, categories, recommendations, admin, monitor, simulation
│       └── jobs/     # enrichment.js (LLM), alerts.js (recommendation + renewal checks)
├── client/           # React SPA (Vite, served from /client/dist)
│   └── src/
│       ├── pages/    # Home, Register, Profile, Recommend, AdminLogin, AdminDashboard,
│       │             # AdminProvider, Monitor, SimGroup, SimProvider, SimRequester
│       ├── components/  # Header
│       └── hooks/    # useApi.js (fetch wrapper)
├── docker-compose.yml
├── Dockerfile        # Multi-stage: build client, then serve from Express
└── .env.example
```

## Four Interfaces
1. **Public** — Provider registration (`/register`), profile page (`/provider/:slug`), recommendation form (`/recommend/:token`)
2. **Admin Dashboard** (`/admin`) — Alerts, provider management, category management, activity reports (PDF export), service request log. Protected by env password.
3. **Monitor Tool** (`/monitor`) — Paste WhatsApp message, Claude parses it, search providers, send match. Protected by same password.
4. **WhatsApp Simulation** (`/sim/*`) — Three screens: group chat, provider inbox, requester inbox. Simulates full message flow.

## Provider Lifecycle
- Register → `active`, `live_at` = null, `enrichment_status` = `pending`
- LLM enrichment runs → `enrichment_status` = `processed`
- Admin reviews → `enrichment_status` = `reviewed`
- Goes live automatically when: profile complete + enrichment processed + at least 1 recommendation → `live_at` set
- 30 days after live, <3 recommendations → admin alert
- 11 months after live → renewal alert
- Status changes (suspend/delete/reactivate) are manual admin actions

## Key Design Decisions
- Raw form inputs always preserved alongside LLM-parsed fields
- Single admin password from env var (no user accounts)
- All WhatsApp messages routed through `outbound_messages` with `delivery_status = 'simulated'`
- Provider profile not visible until live; different messages for not-yet-live vs suspended vs deleted
- Profile visits tracked; `?ref=:request_id` links visits to service requests
- Categories: seeded list + "Other" triggers LLM suggestion + admin approval flow
- Max 3 recommendations per provider; "Community Verified" badge at 3

## What NOT to Build
- Real WhatsApp integration
- Public directory/search for end users
- Payment processing
- Email notifications
- User accounts beyond single admin password
- Automated WhatsApp group monitoring
- MCP integration for external profile scraping (future)

## Running Locally
```bash
# Install dependencies
npm install && cd server && npm install && cd ../client && npm install && cd ..

# Set up .env from .env.example (needs Postgres + Anthropic API key)
cp .env.example .env

# Run migrations
npm run migrate

# Dev mode (server + client concurrently)
npm run dev

# Production build
npm run build && npm start
```

## Deployment
- **Production:** Hostinger VPS at `http://187.77.179.106:3001`
- **Server:** root@187.77.179.106, SSH key `~/.ssh/hostinger_vps`
- **Path on VPS:** `/opt/mishelanu/`
- **Deploy command:** `cd /opt/mishelanu && docker compose up --build -d`
- **Redeploy workflow:** rsync changed files from local → VPS, then rebuild

## Build Progress (2026-04-12)

| Stage | Status | Commit | Notes |
|-------|--------|--------|-------|
| 0. Initial skeleton | Done | `4c21804` | Server scaffold, migrations, Docker config |
| 1. Database setup | Done | `2216331` | Postgres 16 via Homebrew, all migrations, 31 seed categories |
| 2. Server API routes | Done | `013cfd9` | All routes implemented: providers, recs, admin CRUD + PDF, monitor + Claude parsing, simulation |
| 3-6. React client | Done | `a85b5fc` | Full client: register, profile, recommend, admin dashboard, monitor, 3 sim screens |
| 8. Background jobs | Done | `a824b1f` | LLM enrichment (startup + cron), recommendation + renewal alert checks |
| 9. Integration test | Done | — | Full flow tested: register → enrich → recommend → go live → monitor parse → match → YES → requester notified |

### Tested flow
1. Provider registers → gets slug + recommendation token
2. LLM enrichment generates parsed_profile + profile_html + category suggestions
3. Recommendation submitted → provider goes live (after enrichment)
4. Admin sees alerts (new registration, category suggestion)
5. Monitor parses WhatsApp message via Claude → creates request → searches providers → sends match
6. Provider responds YES → requester gets profile link → profile visit tracked
7. All outbound messages logged in simulation tables

### Known items for iteration
- Category "Other" suggestion creates admin alert but the approval-to-dropdown flow needs wiring
- Profile HTML from LLM could benefit from brand styling (currently raw HTML)
- Simulation screens: SimNav links use hardcoded phone numbers — could dynamically pick from active requests
- Admin category add/edit form (currently API-only, no UI form)
- HTTPS not configured — clipboard API requires fallback on HTTP (implemented)
- When seeding providers with recommendations directly in DB, must manually set live_at (enrichment go-live check only triggers during normal flow)
