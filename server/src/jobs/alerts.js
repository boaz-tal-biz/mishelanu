import pool from '../db/pool.js';

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
         WHERE provider_id = p.id AND alert_type = 'missing_recommendations' AND dismissed = false
       )`
  );

  for (const p of rows) {
    await pool.query(
      `INSERT INTO admin_alerts (provider_id, alert_type, alert_message)
       VALUES ($1, 'missing_recommendations', $2)`,
      [p.id, `${p.provider_name} has been live 30+ days with only ${p.rec_count} recommendation(s)`]
    );
    console.log(`Alert created: missing recommendations for ${p.provider_name}`);
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
         WHERE provider_id = p.id AND alert_type = 'renewal_due' AND dismissed = false
       )`
  );

  for (const p of rows) {
    const dueDate = new Date(p.live_at);
    dueDate.setFullYear(dueDate.getFullYear() + 1);

    await pool.query(
      `INSERT INTO admin_alerts (provider_id, alert_type, alert_message, due_date)
       VALUES ($1, 'renewal_due', $2, $3)`,
      [p.id, `Annual renewal due for ${p.provider_name}`, dueDate.toISOString().split('T')[0]]
    );
    console.log(`Alert created: renewal due for ${p.provider_name}`);
  }
}

// Providers whose 72-hour application window has passed without going live.
// If restart_count < 2: create a warning alert (provider can restart).
// If restart_count >= 2: mark application_expired + create expired alert.
export async function checkApplicationDeadlines() {
  const { rows } = await pool.query(
    `SELECT id, first_name, surname, restart_count
     FROM providers
     WHERE live_at IS NULL
       AND application_deadline IS NOT NULL
       AND application_deadline < NOW()
       AND application_expired = false
       AND status != 'deleted'`
  );

  for (const p of rows) {
    const providerName = `${p.first_name} ${p.surname}`;
    if (p.restart_count < 2) {
      const existing = await pool.query(
        `SELECT 1 FROM admin_alerts
         WHERE provider_id = $1 AND alert_type = 'deadline_warning' AND dismissed = false
         LIMIT 1`,
        [p.id]
      );
      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO admin_alerts (provider_id, alert_type, alert_message)
           VALUES ($1, 'deadline_warning', $2)`,
          [p.id, `${providerName}'s 72-hour application window has lapsed (${2 - p.restart_count} restart(s) remaining).`]
        );
        console.log(`Alert: deadline lapsed for ${providerName}`);
      }
    } else {
      await pool.query(
        `UPDATE providers SET application_expired = true, updated_at = NOW() WHERE id = $1`,
        [p.id]
      );
      await pool.query(
        `INSERT INTO admin_alerts (provider_id, alert_type, alert_message)
         VALUES ($1, 'application_expired', $2)`,
        [p.id, `${providerName}'s application has expired — all restarts exhausted.`]
      );
      console.log(`Alert: application expired for ${providerName}`);
    }
  }
}
