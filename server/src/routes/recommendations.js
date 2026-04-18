import { Router } from 'express';
import pool from '../db/pool.js';
import { createAlertSafe } from '../services/alerts.js';

const router = Router();

const VALID_RELATIONSHIPS = ['personal_work', 'personal_known', 'personal_both', 'hearsay'];
const PERSONAL_RELATIONSHIPS = new Set(['personal_work', 'personal_known', 'personal_both']);

// Map new relationship_type back into the legacy enum for raw-preservation writes.
function legacyEnumFor(relationshipType) {
  switch (relationshipType) {
    case 'personal_work':   return 'Client';
    case 'personal_known':  return 'Friend/Family';
    case 'personal_both':   return 'Client';
    case 'hearsay':         return 'Community member';
    default:                return 'Community member';
  }
}

// Get provider info by recommendation token (public).
router.get('/:token', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.first_name, p.surname, p.service_categories,
        (SELECT COUNT(*)::int FROM recommendations WHERE provider_id = p.id) AS recommendation_count
       FROM providers p WHERE p.recommendation_token = $1 AND p.status != 'deleted'`,
      [req.params.token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Invalid recommendation link' });
    }

    const provider = rows[0];
    res.json({
      provider_first_name: provider.first_name,
      provider_surname: provider.surname,
      provider_name: `${provider.first_name} ${provider.surname}`,
      service_categories: provider.service_categories,
      recommendation_count: provider.recommendation_count,
      max_recommendations: 3,
      accepting: provider.recommendation_count < 3,
    });
  } catch (err) {
    next(err);
  }
});

// Submit a recommendation.
router.post('/:token', async (req, res, next) => {
  try {
    const { rows: providers } = await pool.query(
      `SELECT id, first_name, surname, enrichment_status, admin_approved, live_at
       FROM providers WHERE recommendation_token = $1 AND status != 'deleted'`,
      [req.params.token]
    );
    if (providers.length === 0) return res.status(404).json({ error: 'Invalid recommendation link' });
    const provider = providers[0];

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM recommendations WHERE provider_id = $1`,
      [provider.id]
    );
    if (countRows[0].count >= 3) {
      return res.status(400).json({ error: 'This provider already has the maximum number of recommendations' });
    }

    const {
      recommender_first_name,
      recommender_surname,
      recommender_email,
      recommender_phone,
      relationship_type,
      how_long_known,
      last_service_date,
      service_description,
      opt_in_provider,
      opt_in_user,
    } = req.body;

    if (!recommender_first_name || !String(recommender_first_name).trim()) {
      return res.status(400).json({ error: 'recommender_first_name is required' });
    }
    if (!recommender_surname || !String(recommender_surname).trim()) {
      return res.status(400).json({ error: 'recommender_surname is required' });
    }
    if (!recommender_email || !String(recommender_email).trim()) {
      return res.status(400).json({ error: 'recommender_email is required' });
    }
    if (!recommender_phone || !String(recommender_phone).trim()) {
      return res.status(400).json({ error: 'recommender_phone is required' });
    }
    if (!relationship_type || !VALID_RELATIONSHIPS.includes(relationship_type)) {
      return res.status(400).json({
        error: `relationship_type must be one of: ${VALID_RELATIONSHIPS.join(', ')}`,
      });
    }
    if (PERSONAL_RELATIONSHIPS.has(relationship_type)) {
      if (!service_description || !String(service_description).trim()) {
        return res.status(400).json({
          error: 'service_description is required when you have personal experience with this provider',
        });
      }
    }

    const cleanFirst = String(recommender_first_name).trim();
    const cleanSurname = String(recommender_surname).trim();
    const cleanEmail = String(recommender_email).trim();
    const cleanPhone = String(recommender_phone).trim();
    const cleanHowLong = how_long_known ? String(how_long_known).trim() : null;
    const cleanLastDate = last_service_date ? String(last_service_date).trim() : null;
    const cleanService = service_description ? String(service_description).trim() : null;
    const optProvider = !!opt_in_provider;
    const optUser = !!opt_in_user;

    const fullName = `${cleanFirst} ${cleanSurname}`;
    const legacyText = cleanService || cleanHowLong || '(no description)';
    const legacyRelationship = legacyEnumFor(relationship_type);

    // Insert recommendation. Old columns are populated alongside new columns
    // so legacy admin views and exports continue to function.
    const { rows: inserted } = await pool.query(
      `INSERT INTO recommendations
        (provider_id,
         recommender_name, recommender_email, relationship, recommendation_text,
         recommender_first_name, recommender_surname, recommender_phone,
         relationship_type, how_long_known, last_service_date, service_description,
         opt_in_provider, opt_in_user)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id`,
      [
        provider.id,
        fullName, cleanEmail, legacyRelationship, legacyText,
        cleanFirst, cleanSurname, cleanPhone,
        relationship_type, cleanHowLong, cleanLastDate, cleanService,
        optProvider, optUser,
      ]
    );
    const recommendationId = inserted[0].id;

    // Opt-in alerts created BEFORE any later scrub touches contact data.
    const optMeta = {
      recommendation_id: recommendationId,
      recommender_first_name: cleanFirst,
      recommender_surname: cleanSurname,
      recommender_email: cleanEmail,
      recommender_phone: cleanPhone,
      provider_first_name: provider.first_name,
      provider_surname: provider.surname,
    };
    if (optProvider) {
      await createAlertSafe({
        type: 'opt_in_provider',
        providerId: provider.id,
        recommendationId,
        message: `${cleanFirst} ${cleanSurname} (recommender for ${provider.first_name} ${provider.surname}) wants to register as a service provider.`,
        metadata: optMeta,
      });
    }
    if (optUser) {
      await createAlertSafe({
        type: 'opt_in_user',
        providerId: provider.id,
        recommendationId,
        message: `${cleanFirst} ${cleanSurname} (recommender for ${provider.first_name} ${provider.surname}) wants to join as a user.`,
        metadata: optMeta,
      });
    }

    const newCount = countRows[0].count + 1;

    // Recommendation received alert
    await createAlertSafe({
      type: 'recommendation_received',
      providerId: provider.id,
      recommendationId,
      message: `${cleanFirst} ${cleanSurname} recommended ${provider.first_name} ${provider.surname} (${newCount} of 3).`,
      metadata: { count: newCount, total_needed: 3 },
    });

    // Hearsay flag
    if (relationship_type === 'hearsay') {
      await createAlertSafe({
        type: 'hearsay_recommendation',
        providerId: provider.id,
        recommendationId,
        message: `Hearsay recommendation from ${cleanFirst} ${cleanSurname} for ${provider.first_name} ${provider.surname}.`,
        metadata: { relationship_type },
      });
    }

    // At 3rd recommendation: approval_ready (dedup handled by createAlert)
    if (newCount === 3 && !provider.live_at) {
      await createAlertSafe({
        type: 'approval_ready',
        providerId: provider.id,
        message: `${provider.first_name} ${provider.surname} has 3 recommendations — ready for your review and approval.`,
      });
    }

    // Go-live check: enrichment processed + admin_approved.
    // (rec_count gate dropped here too — admin_approved IS the override.)
    if (!provider.live_at
        && provider.admin_approved
        && (provider.enrichment_status === 'processed' || provider.enrichment_status === 'reviewed')) {
      await pool.query(
        `UPDATE providers SET live_at = NOW(), updated_at = NOW() WHERE id = $1 AND live_at IS NULL`,
        [provider.id]
      );
    }

    res.status(201).json({
      ok: true,
      message: 'Recommendation submitted',
      recommendation_count: newCount,
      threshold_reached: newCount >= 3,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
