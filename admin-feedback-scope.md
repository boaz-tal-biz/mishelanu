# Mishelanu — Agreed Scope from Admin Feedback

**Date:** 2026-04-15
**Status:** [Boaz-approved] 2026-04-17

**Backend extension brief:** see `phase1-backend-extension.md` (also Boaz-approved 2026-04-17). Covers registration form fields, application deadline + restart logic, category aliases + admin actions, go-live rule change (admin approval required), new alert types, contact form endpoint.

---

## Design & Tone Overhaul

1. **Deliveroo-inspired redesign** — fun, light, bold colour, playful UI. Mobile-first.
2. **Branded voice throughout** — personify Mishelanu in all system messages. "Mishelanu is finding you a match", "Mishelanu thanks you", etc.
3. **Jewish cultural expressions** — weave into UI copy: confirmations, empty states, loading screens, errors. Yom Tov, Hatzlacha, Mazel Tov, Oy vey, etc.
4. **Remove all programmer language** — no "parsed", no "pending enrichment". Plain, warm, human copy everywhere.
5. **More colour, more branding, more community feel.**

---

## Matching Flow Changes

6. **Up to 3 providers per request** — monitor tool surfaces up to 3 matches.
7. **Requester chooses** — requester receives a shortlist and picks their provider.
8. **Single thumbs up/down per request** — after the interaction, requester rates the overall experience once. Track which provider was selected as a separate data point for rankings.

---

## Categories Restructure

9. **Two-tier hierarchy** — top-level categories (Education, Legal, Household & Property, Motor, Insurance, Community, Employment, Pets, Medical, etc.) with sub-categories underneath.
10. **Keep "Other" suggestion flow** — providers can still suggest via "Other", admin approves. No user-created categories.
11. **Migrate existing 31 categories** into the new hierarchy as sub-categories.

---

## Reporting Dashboard (Phase 1: Fixed)

12. **Fixed dashboard with core metrics:**
    - Requests per week/month
    - Match success rate (provider said YES)
    - Provider response times
    - Category demand breakdown
    - Provider popularity / profile visits
    - Providers live vs pending
    - Provider ratings / top providers per category
    - Geographic area breakdown
    - Repeat customers (requests per person)

13. **Phase 2 (later):** Flexible report builder — admin chooses dimensions and filters.

---

## Community Calendar (Phase 1: Admin-Only)

14. **Admin-posted events and announcements** — shiurim, social, charity, community news.
15. **Jewish festival dates pre-loaded** — comprehensive calendar (all festivals, fast days, notable dates).
16. **Calendar view** as primary format.
17. **Phase 2 (later):** Community-submitted content with admin approval queue.
18. **Phase 3 (later):** Noticeboard/feed view alongside calendar.

---

## Jewish Dates & Festivals

19. **Comprehensive Jewish calendar** — all festivals, fast days, notable dates. Not just the major ones.
20. **Automated festival greetings** — "Chag Sameach from Mishelanu!" etc.
21. **Shabbat/Yom Tov awareness** — acknowledge timing in system behaviour.

---

## Feedback System

22. **Requester:** Thumbs up/down after each match (doubles as read receipt).
23. **Providers:** Periodic review system (separate feature, later phase).

---

## Other

24. **Contact Us page** — contact details and/or form.
25. **Request display cleanup** — declutter admin request list. Provider details behind a link, not inline.

---

## Out of Scope (unchanged from original)

- Real WhatsApp integration
- Public directory/search
- Payment processing
- Email notifications
- User accounts beyond admin
- Automated WhatsApp group monitoring

---

## Phasing Summary

| Phase | What |
|-------|------|
| **Now** | Design/tone overhaul, matching flow (up to 3), category restructure, thumbs up/down, request display cleanup, Contact Us, remove programmer language |
| **Now** | Fixed reporting dashboard, admin-only community calendar with Jewish dates |
| **Later** | Flexible report builder |
| **Later** | Community-submitted calendar content with approval |
| **Later** | Noticeboard/feed view |
| **Later** | Provider periodic review system |
