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
│       ├── index.js
│       ├── db/       # pool, migrations
│       ├── middleware/
│       └── routes/   # providers, categories, recommendations, admin, monitor, simulation
├── client/           # React SPA (served from /client/dist)
│   └── src/
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
Docker Compose: `docker compose up --build`
Designed to run on a VPS with Docker installed.
