import pool from '../db/pool.js';
import { ALERT_TYPES } from '../constants/alertTypes.js';

/**
 * Create an alert. Deduplicates non-system_log alerts: if an unresolved alert
 * of the same type for the same provider exists, updates it instead.
 */
export async function createAlert({ type, providerId = null, recommendationId = null, message = null, metadata = null }) {
  const def = ALERT_TYPES[type];
  if (!def) {
    console.error(`Unknown alert type: ${type}`);
    return null;
  }

  // Deduplicate non-system_log alerts for the same provider
  if (def.tier !== 'system_log' && providerId) {
    const { rows: existing } = await pool.query(
      `SELECT id FROM admin_alerts
       WHERE type = $1 AND provider_id = $2 AND is_resolved = false
       LIMIT 1`,
      [type, providerId]
    );
    if (existing.length > 0) {
      const { rows } = await pool.query(
        `UPDATE admin_alerts
         SET message = COALESCE($1, message),
             metadata = COALESCE($2, metadata),
             created_at = NOW(),
             is_read = false
         WHERE id = $3
         RETURNING *`,
        [message, metadata ? JSON.stringify(metadata) : null, existing[0].id]
      );
      return rows[0];
    }
  }

  const { rows } = await pool.query(
    `INSERT INTO admin_alerts (type, tier, title, message, provider_id, recommendation_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [type, def.tier, def.title, message, providerId, recommendationId, metadata ? JSON.stringify(metadata) : null]
  );
  return rows[0];
}

/**
 * Wrap alert creation in try/catch so it never blocks the primary action.
 */
export async function createAlertSafe(params) {
  try {
    return await createAlert(params);
  } catch (err) {
    console.error(`Alert creation failed (${params.type}):`, err.message);
    return null;
  }
}
