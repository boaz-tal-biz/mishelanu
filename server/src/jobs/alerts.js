import pool from '../db/pool.js';
import { createAlertSafe } from '../services/alerts.js';
import { scrubRecommenderDetails } from '../services/recommendations.js';

export async function checkMissingRecommendations() {
  const { rows } = await pool.query(
    `SELECT p.id, (p.first_name || ' ' || p.surname) AS provider_name,
       (SELECT COUNT(*)::int FROM recommendations WHERE provider_id = p.id) AS rec_count
     FROM providers p
     WHERE p.live_at IS NOT NULL
       AND p.live_at < NOW() - INTERVAL '30 days'
       AND p.status = 'active'
       AND (SELECT COUNT(*)::int FROM recommendations WHERE provider_id = p.id) < 3
       AND NOT EXISTS (
         SELECT 1 FROM admin_alerts
         WHERE provider_id = p.id AND type = 'low_recommendation_warning' AND is_resolved = false
       )`
  );

  for (const p of rows) {
    await createAlertSafe({
      type: 'low_recommendation_warning',
      providerId: p.id,
      message: `${p.provider_name} has been live 30+ days with only ${p.rec_count} recommendation(s).`,
    });
    console.log(`Alert: low recommendations for ${p.provider_name}`);
  }
}

export async function checkRenewalDue() {
  const { rows } = await pool.query(
    `SELECT p.id, (p.first_name || ' ' || p.surname) AS provider_name, p.live_at
     FROM providers p
     WHERE p.live_at IS NOT NULL
       AND p.live_at < NOW() - INTERVAL '11 months'
       AND p.status = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM admin_alerts
         WHERE provider_id = p.id AND type = 'renewal_approaching' AND is_resolved = false
       )`
  );

  for (const p of rows) {
    await createAlertSafe({
      type: 'renewal_approaching',
      providerId: p.id,
      message: `Annual renewal due for ${p.provider_name}.`,
    });
    console.log(`Alert: renewal due for ${p.provider_name}`);
  }
}

export async function checkApplicationDeadlines() {
  const { rows } = await pool.query(
    `SELECT id, first_name, surname, restart_count, application_deadline
     FROM providers
     WHERE live_at IS NULL
       AND application_deadline IS NOT NULL
       AND application_deadline < NOW()
       AND application_expired = false
       AND status != 'deleted'`
  );

  for (const p of rows) {
    const providerName = `${p.first_name} ${p.surname}`;
    const hoursLeft = p.application_deadline
      ? Math.max(0, (new Date(p.application_deadline).getTime() - Date.now()) / 3600000)
      : 0;

    if (p.restart_count < 2) {
      await createAlertSafe({
        type: 'registration_expired',
        providerId: p.id,
        message: `${providerName}'s 72-hour application window has lapsed (${2 - p.restart_count} restart(s) remaining).`,
        metadata: { restart_count: p.restart_count, restarts_remaining: 2 - p.restart_count },
      });
      console.log(`Alert: deadline lapsed for ${providerName}`);
    } else {
      await pool.query(
        `UPDATE providers SET application_expired = true, updated_at = NOW() WHERE id = $1`,
        [p.id]
      );
      await createAlertSafe({
        type: 'registration_permanently_expired',
        providerId: p.id,
        message: `${providerName}'s application has expired — all restarts exhausted.`,
      });
      try {
        const n = await scrubRecommenderDetails(p.id, 'application_expired');
        console.log(`Alert: application expired for ${providerName} (${n} recommendation(s) scrubbed)`);
      } catch (err) {
        console.error(`[expire] scrub failed for ${p.id}:`, err.message);
      }
    }
  }
}
