// Mishelanu deployment smoke test.
//
// Runs against a local dev server on http://localhost:3001.
// Six sequential tests, each depending on the previous. No test framework —
// just plain Node + fetch + a direct DB pool for setup and cleanup.
//
// Usage: node server/src/tests/smoke-test.js
//
// Assumes:
//   - Server running on PORT 3001
//   - Database migrated (migrations 001–010)
//   - SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD set in env

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const { default: pool } = await import('../db/pool.js');

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3001';
const ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

// ─── plumbing ──────────────────────────────────────────────────────────────

let authToken = '';

async function req(method, pathPart, body, { admin = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (admin && authToken) headers.Authorization = `Bearer ${authToken}`;
  const init = { method, headers };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${pathPart}`, init);
  let data = null;
  const ctype = res.headers.get('content-type') || '';
  if (ctype.includes('application/json')) {
    try { data = await res.json(); } catch { /* fall through */ }
  } else {
    try { data = await res.text(); } catch { /* fall through */ }
  }
  return { status: res.status, body: data };
}

class TestFail extends Error {}
function check(condition, message) {
  if (!condition) throw new TestFail(message);
}

const results = [];
async function runTest(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    results.push({ name, ok: false, message: err.message });
    console.log(`  ✗ ${name}`);
    console.log(`      ${err.message}`);
  }
}

// ─── shared state across tests ─────────────────────────────────────────────

const ctx = {
  slug: null,
  recommendation_token: null,
  management_token: null,
  provider_id: null,
};

// Map the spec's field names onto the API's actual field names.
function buildRegistrationBody() {
  return {
    first_name: 'Test',
    surname: 'Provider',
    area_covered: 'North London',
    email: 'test-smoke@example.com',
    mobile_phone: '07700000000',
    raw_description: 'Smoke test provider for deployment verification',
    service_categories: ['Plumbing', 'Balloon Artist'],
    years_in_business: 5,
    vat_number: 'GB123456789',
    payment_types: ['cash', 'card', 'other'],
    payment_types_other: 'Crypto',
    business_size: 'small',
    affiliations: 'Test Guild',
  };
}

// ─── tests ─────────────────────────────────────────────────────────────────

async function test1Registration() {
  const { status, body } = await req('POST', '/api/providers', buildRegistrationBody());
  check(status === 201, `expected 201, got ${status}: ${JSON.stringify(body)}`);
  check(typeof body.slug === 'string' && body.slug.length > 0, `slug missing or empty: ${body.slug}`);
  check(typeof body.recommendation_token === 'string' && body.recommendation_token.length > 0,
    `recommendation_token missing: ${body.recommendation_token}`);
  check(typeof body.management_token === 'string' && body.management_token.length > 0,
    `management_token missing: ${body.management_token}`);
  ctx.slug = body.slug;
  ctx.recommendation_token = body.recommendation_token;
  ctx.management_token = body.management_token;
  ctx.provider_id = body.id;
}

async function test2ManagementAuth() {
  const good = await req('GET', `/api/providers/${ctx.slug}/manage?token=${ctx.management_token}`);
  check(good.status === 200, `valid token: expected 200, got ${good.status}`);
  check(good.body.application_deadline, 'application_deadline missing');
  check(good.body.restart_count === 0, `restart_count expected 0, got ${good.body.restart_count}`);
  check(good.body.admin_approved === false, `admin_approved expected false, got ${good.body.admin_approved}`);
  check(good.body.live_at === null, `live_at expected null, got ${good.body.live_at}`);

  const bad = await req('GET', `/api/providers/${ctx.slug}/manage?token=fake-uuid-12345`);
  check(bad.status === 403, `bad token: expected 403, got ${bad.status}`);
}

async function test3CategorySuggested() {
  // Admin login via JWT
  const login = await req('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  check(login.status === 200, `admin login failed: ${login.status} ${JSON.stringify(login.body)}`);
  authToken = login.body.token;

  const { status, body } = await req('GET', '/api/admin/categories', undefined, { admin: true });
  check(status === 200, `expected 200, got ${status}`);
  check(Array.isArray(body), 'expected array of categories');
  const balloon = body.find(c =>
    (c.subcategory || '').toLowerCase() === 'balloon artist'
    && c.status === 'suggested'
  );
  check(!!balloon, 'no "balloon artist" category with status=suggested found');
}

async function test4ThreeRecommendations() {
  for (let i = 1; i <= 3; i++) {
    const isHearsay = i === 3;
    const body = {
      recommender_first_name: `Rec${i}`,
      recommender_surname: `Tester${i}`,
      recommender_email: `rec${i}@example.com`,
      recommender_phone: `0770000000${i}`,
      relationship_type: isHearsay ? 'hearsay' : 'personal_work',
      how_long_known: '3 years',
      opt_in_provider: false,
      opt_in_user: false,
    };
    if (!isHearsay) {
      body.last_service_date = 'Last month';
      body.service_description = 'Excellent plumbing work';
    }
    const { status, body: respBody } = await req('POST', `/api/recommendations/${ctx.recommendation_token}`, body);
    check(status === 200 || status === 201,
      `recommendation #${i}: expected 200/201, got ${status}: ${JSON.stringify(respBody)}`);
  }

  const { status, body } = await req('GET', `/api/providers/${ctx.slug}/manage?token=${ctx.management_token}`);
  check(status === 200, `manage GET after 3 recs: expected 200, got ${status}`);
  check(body.recommendation_count === 3,
    `expected recommendation_count=3, got ${body.recommendation_count}`);
}

async function test5ApproveAndScrub() {
  await pool.query(
    `UPDATE providers SET enrichment_status = 'processed' WHERE id = $1`,
    [ctx.provider_id]
  );

  const { status: listStatus, body: providers } = await req(
    'GET', `/api/admin/providers?search=${encodeURIComponent('Test Provider')}`,
    undefined, { admin: true }
  );
  check(listStatus === 200, `admin providers list: ${listStatus}`);
  const found = providers.find(p => p.slug === ctx.slug);
  check(!!found, 'newly registered provider not found in admin list');
  check(found.id === ctx.provider_id, 'admin list id mismatch with registration id');

  const approve = await req(
    'POST', `/api/admin/providers/${ctx.provider_id}/approve`, {}, { admin: true }
  );
  check(approve.status === 200, `approve: expected 200, got ${approve.status} ${JSON.stringify(approve.body)}`);

  const manage = await req('GET', `/api/providers/${ctx.slug}/manage?token=${ctx.management_token}`);
  check(manage.status === 200, `manage GET after approve: ${manage.status}`);
  check(manage.body.admin_approved === true, `admin_approved expected true, got ${manage.body.admin_approved}`);
  check(manage.body.live_at !== null, 'live_at expected non-null after approve (with enrichment processed)');

  const detail = await req(
    'GET', `/api/admin/providers/${ctx.provider_id}`,
    undefined, { admin: true }
  );
  check(detail.status === 200, `admin provider detail: ${detail.status}`);
  const recs = detail.body.recommendations || [];
  const scrubbedCount = recs.filter(r => r.details_scrubbed === true || r.recommender_email === null).length;
  check(scrubbedCount >= 1,
    `expected at least 1 recommendation scrubbed, got ${scrubbedCount} of ${recs.length}`);

  const summaryText = (detail.body.recommendations_summary?.text || '').toLowerCase();
  const summaryMentionsHearsay = summaryText.includes('hearsay');
  const recsExposeRelationship = recs.some(r => r.relationship_type === 'hearsay');
  check(summaryMentionsHearsay || recsExposeRelationship,
    'no hearsay relationship_type visible in summary or recommendation list');
}

async function test6PublicProfile() {
  const { status, body } = await req('GET', `/api/providers/${ctx.slug}`);
  check(status === 200, `public profile: expected 200, got ${status} ${JSON.stringify(body)}`);
  check(body.slug === ctx.slug, `slug mismatch: ${body.slug}`);
  check(body.live_at, 'public profile should expose live_at when provider is live');
  check(body.management_token === undefined,
    'management_token must NOT be in the public profile response');
}

// ─── runner ────────────────────────────────────────────────────────────────

async function cleanup() {
  if (!ctx.provider_id) {
    try {
      await pool.query(
        `DELETE FROM service_categories_registry
         WHERE lower(subcategory) = 'balloon artist' AND status = 'suggested'`
      );
    } catch { /* best-effort */ }
    return;
  }

  const cleanupSql = [
    [`DELETE FROM admin_alerts WHERE provider_id = $1`, [ctx.provider_id]],
    [`DELETE FROM recommendation_scrub_log WHERE provider_id = $1`, [ctx.provider_id]],
    [`DELETE FROM recommendations WHERE provider_id = $1`, [ctx.provider_id]],
    [`DELETE FROM service_categories_registry WHERE suggested_by_provider_id = $1`, [ctx.provider_id]],
    [`DELETE FROM providers WHERE id = $1`, [ctx.provider_id]],
    [`DELETE FROM service_categories_registry WHERE lower(subcategory) = 'balloon artist' AND status = 'suggested'`, []],
  ];

  for (const [sql, params] of cleanupSql) {
    try {
      await pool.query(sql, params);
    } catch (err) {
      console.log(`  cleanup warning: ${err.message}`);
    }
  }
}

async function main() {
  console.log(`Mishelanu smoke test → ${BASE}`);
  console.log('');

  await runTest('Test 1: registration with new fields', test1Registration);
  if (ctx.slug) {
    await runTest('Test 2: management token auth (good + bad)', test2ManagementAuth);
    await runTest('Test 3: unknown category created as "suggested"', test3CategorySuggested);
    await runTest('Test 4: submit 3 recommendations', test4ThreeRecommendations);
    await runTest('Test 5: admin approve and recommendation scrub', test5ApproveAndScrub);
    await runTest('Test 6: public profile access without token', test6PublicProfile);
  } else {
    console.log('  (skipping tests 2–6 — registration failed)');
  }

  console.log('');
  await cleanup();

  console.log('');
  console.log(`${results.filter(r => r.ok).length}/6 tests passed`);

  await pool.end();
  process.exit(results.every(r => r.ok) ? 0 : 1);
}

main().catch(async (err) => {
  console.error('FATAL:', err);
  try { await cleanup(); } catch { /* noop */ }
  try { await pool.end(); } catch { /* noop */ }
  process.exit(1);
});
