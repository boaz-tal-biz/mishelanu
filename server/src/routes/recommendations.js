import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

// Get provider info by recommendation token (public)
router.get('/:token', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.full_name, p.service_categories,
        (SELECT COUNT(*)::int FROM recommendations WHERE provider_id = p.id) AS recommendation_count
       FROM providers p WHERE p.recommendation_token = $1 AND p.status != 'deleted'`,
      [req.params.token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Invalid recommendation link' });
    }

    const provider = rows[0];
    res.json({
      provider_name: provider.full_name,
      service_categories: provider.service_categories,
      recommendation_count: provider.recommendation_count,
      max_recommendations: 3,
      accepting: provider.recommendation_count < 3
    });
  } catch (err) {
    next(err);
  }
});

// Submit a recommendation
router.post('/:token', async (req, res, next) => {
  try {
    const { rows: providers } = await pool.query(
      `SELECT id, full_name, enrichment_status, live_at
       FROM providers WHERE recommendation_token = $1 AND status != 'deleted'`,
      [req.params.token]
    );

    if (providers.length === 0) {
      return res.status(404).json({ error: 'Invalid recommendation link' });
    }

    const provider = providers[0];

    // Check count
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM recommendations WHERE provider_id = $1`,
      [provider.id]
    );

    if (countRows[0].count >= 3) {
      return res.status(400).json({ error: 'This provider already has the maximum number of recommendations' });
    }

    const { recommender_name, recommender_email, relationship, recommendation_text } = req.body;

    if (!recommender_name || !relationship || !recommendation_text) {
      return res.status(400).json({ error: 'recommender_name, relationship, and recommendation_text are required' });
    }

    if (recommendation_text.length > 300) {
      return res.status(400).json({ error: 'Recommendation text must be 300 characters or fewer' });
    }

    await pool.query(
      `INSERT INTO recommendations (provider_id, recommender_name, recommender_email, relationship, recommendation_text)
       VALUES ($1, $2, $3, $4, $5)`,
      [provider.id, recommender_name, recommender_email || null, relationship, recommendation_text]
    );

    // Check if provider should go live: at least 1 recommendation + enrichment processed/reviewed
    if (!provider.live_at && (provider.enrichment_status === 'processed' || provider.enrichment_status === 'reviewed')) {
      await pool.query(
        `UPDATE providers SET live_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [provider.id]
      );
    }

    res.status(201).json({ ok: true, message: 'Recommendation submitted' });
  } catch (err) {
    next(err);
  }
});

export default router;
