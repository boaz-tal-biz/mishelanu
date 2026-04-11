import { Router } from 'express';
import pool from '../db/pool.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

function generateSlug(name, businessName) {
  const base = (businessName || name).toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  const suffix = uuidv4().slice(0, 6);
  return `${base}-${suffix}`;
}

// Register a new provider
router.post('/', async (req, res, next) => {
  try {
    const {
      full_name, business_name, address,
      mobile_phone, whatsapp_number, business_phone,
      email, service_categories, raw_description, raw_external_links
    } = req.body;

    if (!full_name || !mobile_phone || !email) {
      return res.status(400).json({ error: 'full_name, mobile_phone, and email are required' });
    }

    const slug = generateSlug(full_name, business_name);
    const wa = whatsapp_number || mobile_phone;

    const { rows } = await pool.query(
      `INSERT INTO providers
        (slug, full_name, business_name, address, mobile_phone, whatsapp_number,
         business_phone, email, service_categories, raw_description, raw_external_links)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id, slug, recommendation_token`,
      [slug, full_name, business_name || null, address || null,
       mobile_phone, wa, business_phone || null, email,
       service_categories || [], raw_description || null, raw_external_links || null]
    );

    const provider = rows[0];

    // Create admin alert for new registration
    await pool.query(
      `INSERT INTO admin_alerts (provider_id, alert_type, alert_message)
       VALUES ($1, 'new_registration', $2)`,
      [provider.id, `New provider registration: ${full_name}`]
    );

    res.status(201).json({
      id: provider.id,
      slug: provider.slug,
      recommendation_token: provider.recommendation_token,
      profile_url: `/provider/${provider.slug}`,
      recommendation_url: `/recommend/${provider.recommendation_token}`
    });
  } catch (err) {
    next(err);
  }
});

// Get provider profile by slug (public)
router.get('/:slug', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*,
        (SELECT COUNT(*)::int FROM recommendations WHERE provider_id = p.id) AS recommendation_count
       FROM providers p WHERE p.slug = $1`,
      [req.params.slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const provider = rows[0];

    if (provider.status === 'deleted') {
      return res.status(404).json({ error: 'Provider not found' });
    }

    if (provider.status === 'suspended' || provider.status === 'awaiting_payment') {
      return res.json({ status: provider.status, message: 'This provider is currently unavailable' });
    }

    if (!provider.live_at) {
      return res.json({ status: 'pending', message: 'This provider is completing their registration' });
    }

    // Log profile visit
    const refRequestId = req.query.ref || null;
    await pool.query(
      `INSERT INTO profile_visits (provider_id, service_request_id, referrer)
       VALUES ($1, $2, $3)`,
      [provider.id, refRequestId, req.get('referer') || null]
    );

    // If visit is from a service request ref, notify provider
    if (refRequestId) {
      await pool.query(
        `INSERT INTO outbound_messages (service_request_id, provider_id, recipient_phone, message_type, message_body)
         VALUES ($1, $2, $3, 'provider_visit_notification',
           'The person we connected you with has viewed your Mishelanu profile.')`,
        [refRequestId, provider.id, provider.whatsapp_number]
      );

      // Update request status
      await pool.query(
        `UPDATE service_requests SET status = 'profile_viewed', updated_at = NOW()
         WHERE id = $1 AND status = 'requester_notified'`,
        [refRequestId]
      );
    }

    // Get recommendations
    const { rows: recs } = await pool.query(
      `SELECT recommender_name, relationship, recommendation_text, created_at
       FROM recommendations WHERE provider_id = $1 ORDER BY created_at`,
      [provider.id]
    );

    res.json({
      slug: provider.slug,
      full_name: provider.full_name,
      business_name: provider.business_name,
      service_categories: provider.service_categories,
      profile_html: provider.profile_html,
      parsed_profile: provider.parsed_profile,
      raw_external_links: provider.raw_external_links,
      mobile_phone: provider.mobile_phone,
      whatsapp_number: provider.whatsapp_number,
      recommendations: recs,
      recommendation_count: provider.recommendation_count,
      verified: provider.recommendation_count >= 3,
      live_at: provider.live_at
    });
  } catch (err) {
    next(err);
  }
});

export default router;
