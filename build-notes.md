# Mishelanu Phase 1 Backend Extension — Build Notes

**Session:** 2026-04-17
**Spec:** `phase1-backend-extension.md`
**Mandate:** proceed through all remaining build tasks without check-ins; document judgement calls here; stop at Task 13 for review.

## Judgement calls (running log)

### Migrations (Tasks 1–3)

1. **TRUNCATE → ordered DELETEs** — original migration 004 used `TRUNCATE ... CASCADE` on `providers`. Caught in local test: cascaded into `service_categories_registry` (nullable FK) and wiped the 31 seed categories, leaving alias seed with nothing to JOIN. Rewrote as ordered `DELETE`s + null-out of `suggested_by_provider_id`. Categories preserved.

2. **`pending_approval` enum value retained** — current `category_status` enum has `'pending_approval'` (unused). Per spec, new code routes through `'suggested'`. Kept the old enum value in place; dropping it would require a type recreation and is unsafe against any stray reference. `IF NOT EXISTS` makes re-runs idempotent.

3. **Consolidated `recommendation_complete` into `approval_ready`** — brief mentioned both but they fire at the same moment. Single alert avoids duplicate inbox entries. Flagged in chat, confirmed by silence.

4. **Seed aliases count** — 79 aliases across 31 categories, averaging 2–3 per category. Covers canonical name, common plural/verb forms, and obvious synonyms (lawyer → solicitor/lawyer, physio → physiotherapist). Not exhaustive — admin can add more via endpoint.

5. **CHECK constraint on `restart_count`** — spec said "max 2 enforced in app code". I also added a DB-level CHECK (0–2) as belt-and-braces. Cheap to enforce twice; prevents manual SQL mistakes later.

### (Further entries appended as subsequent tasks land)
