import pool from '../db/pool.js';

/**
 * Permanently null out personally-identifying contact details on every
 * recommendation belonging to the given provider, mark each row as scrubbed,
 * and write an audit row.
 *
 * Triggered automatically when:
 *   - admin approves a provider (triggeredBy = 'admin_approval')
 *   - a provider's application is marked permanently expired
 *     (triggeredBy = 'application_expired')
 *
 * The recommendation content (service_description, recommendation_text,
 * how_long_known, last_service_date, relationship_type, first name, created_at)
 * is preserved so admins can still see WHAT each recommender said. Only the
 * data that could identify or contact the recommender is removed.
 *
 * Old columns recommender_name (full name) and recommender_email (legacy) are
 * also nulled because they carry the same identifying data — leaving them set
 * would defeat the purpose of the scrub.
 *
 * Returns the number of recommendation rows that were scrubbed.
 */
export async function scrubRecommenderDetails(providerId, triggeredBy = 'manual', client = pool) {
  const { rows: countRows } = await client.query(
    `SELECT COUNT(*)::int AS count FROM recommendations WHERE provider_id = $1`,
    [providerId]
  );
  const total = countRows[0].count;
  if (total === 0) return 0;

  await client.query(
    `UPDATE recommendations
       SET recommender_email   = NULL,
           recommender_phone   = NULL,
           recommender_surname = NULL,
           recommender_name    = NULL,
           details_scrubbed    = true
     WHERE provider_id = $1
       AND details_scrubbed = false`,
    [providerId]
  );

  await client.query(
    `INSERT INTO recommendation_scrub_log (provider_id, records_scrubbed, triggered_by)
     VALUES ($1, $2, $3)`,
    [providerId, total, triggeredBy]
  );

  console.log(`[scrub] provider=${providerId} records=${total} trigger=${triggeredBy}`);
  return total;
}
