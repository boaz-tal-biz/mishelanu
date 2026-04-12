import pool from '../db/pool.js';

export async function checkMissingRecommendations() {
  // Providers live 30+ days with <3 recommendations, no existing active alert
  const { rows } = await pool.query(
    `SELECT p.id, p.full_name,
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
      [p.id, `${p.full_name} has been live 30+ days with only ${p.rec_count} recommendation(s)`]
    );
    console.log(`Alert created: missing recommendations for ${p.full_name}`);
  }
}

export async function checkRenewalDue() {
  // Providers at 11 months from live_at, no existing active alert
  const { rows } = await pool.query(
    `SELECT p.id, p.full_name, p.live_at
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
      [p.id, `Annual renewal due for ${p.full_name}`, dueDate.toISOString().split('T')[0]]
    );
    console.log(`Alert created: renewal due for ${p.full_name}`);
  }
}
