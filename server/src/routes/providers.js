import { Router } from 'express';
import pool from '../db/pool.js';
import { v4 as uuidv4 } from 'uuid';
import { resolveCategories } from '../services/categories.js';

const router = Router();

function generateSlug(firstName, surname, businessName) {
  const nameBase = `${firstName || ''} ${surname || ''}`.trim();
  const base = (businessName || nameBase).toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  const suffix = uuidv4().slice(0, 6);
  return `${base}-${suffix}`;
}

const VALID_PAYMENT_TYPES = ['cash', 'card', 'bank_transfer', 'other'];
const VALID_BUSINESS_SIZES = ['small', 'medium', 'large', 'other'];

// Register a new provider
router.post('/', async (req, res, next) => {
  try {
    const {
      first_name, surname, business_name, address, area_covered,
      mobile_phone, whatsapp_number, business_phone, email,
      service_categories, raw_description, raw_external_links,
      vat_number, companies_house_number, sole_trader_utr,
      years_in_business, affiliations,
      payment_types, payment_types_other,
      business_size, business_size_other
    } = req.body;

    if (!first_name || !surname || !mobile_phone || !email) {
      return res.status(400).json({ error: 'first_name, surname, mobile_phone, and email are required' });
    }

    if (service_categories !== undefined && service_categories !== null && !Array.isArray(service_categories)) {
      return res.status(400).json({ error: 'service_categories must be an array of strings' });
    }

    let paymentTypesClean = null;
    if (payment_types !== undefined && payment_types !== null) {
      if (!Array.isArray(payment_types)) {
        return res.status(400).json({ error: 'payment_types must be an array' });
      }
      for (const pt of payment_types) {
        if (!VALID_PAYMENT_TYPES.includes(pt)) {
          return res.status(400).json({ error: `payment_types must contain only: ${VALID_PAYMENT_TYPES.join(', ')}` });
        }
      }
      paymentTypesClean = payment_types;
    }
    let paymentOtherClean = null;
    if (paymentTypesClean && paymentTypesClean.includes('other')) {
      if (!payment_types_other || !String(payment_types_other).trim()) {
        return res.status(400).json({ error: "payment_types_other is required when 'other' is selected in payment_types" });
      }
      paymentOtherClean = String(payment_types_other).trim();
    }

    let businessSizeClean = null;
    if (business_size !== undefined && business_size !== null && business_size !== '') {
      if (!VALID_BUSINESS_SIZES.includes(business_size)) {
        return res.status(400).json({ error: `business_size must be one of: ${VALID_BUSINESS_SIZES.join(', ')}` });
      }
      businessSizeClean = business_size;
    }
    let businessSizeOtherClean = null;
    if (businessSizeClean === 'other') {
      if (!business_size_other || !String(business_size_other).trim()) {
        return res.status(400).json({ error: "business_size_other is required when business_size is 'other'" });
      }
      businessSizeOtherClean = String(business_size_other).trim();
    }

    const slug = generateSlug(first_name, surname, business_name);
    const wa = whatsapp_number || mobile_phone;

    const { rows } = await pool.query(
      `INSERT INTO providers
        (slug, first_name, surname, business_name, address, area_covered,
         mobile_phone, whatsapp_number, business_phone, email,
         service_categories, raw_description, raw_external_links,
         vat_number, companies_house_number, sole_trader_utr,
         years_in_business, affiliations,
         payment_types, payment_types_other, business_size, business_size_other,
         application_deadline)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
               $19,$20,$21,$22,
               NOW() + INTERVAL '72 hours')
       RETURNING id, slug, recommendation_token, management_token, application_deadline`,
      [
        slug, first_name, surname, business_name || null, address || null, area_covered || null,
        mobile_phone, wa, business_phone || null, email,
        service_categories || [], raw_description || null, raw_external_links || null,
        vat_number || null, companies_house_number || null, sole_trader_utr || null,
        years_in_business || null, affiliations || null,
        paymentTypesClean, paymentOtherClean, businessSizeClean, businessSizeOtherClean
      ]
    );

    const provider = rows[0];

    // Resolve categories (aliases → active, else create suggested)
    await resolveCategories(service_categories || []);

    // Create admin alert for new registration
    await pool.query(
      `INSERT INTO admin_alerts (provider_id, alert_type, alert_message)
       VALUES ($1, 'new_registration', $2)`,
      [provider.id, `New provider registration: ${first_name} ${surname}`]
    );

    res.status(201).json({
      id: provider.id,
      slug: provider.slug,
      recommendation_token: provider.recommendation_token,
      management_token: provider.management_token,
      application_deadline: provider.application_deadline,
      profile_url: `/provider/${provider.slug}`,
      recommendation_url: `/recommend/${provider.recommendation_token}`,
      manage_url: `/provider/${provider.slug}/manage?token=${provider.management_token}`
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

      await pool.query(
        `UPDATE service_requests SET status = 'profile_viewed', updated_at = NOW()
         WHERE id = $1 AND status = 'requester_notified'`,
        [refRequestId]
      );
    }

    const { rows: recs } = await pool.query(
      `SELECT recommender_name, relationship, recommendation_text, created_at
       FROM recommendations WHERE provider_id = $1 ORDER BY created_at`,
      [provider.id]
    );

    res.json({
      slug: provider.slug,
      first_name: provider.first_name,
      surname: provider.surname,
      full_name: `${provider.first_name} ${provider.surname}`,
      business_name: provider.business_name,
      area_covered: provider.area_covered,
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadProviderByManagementToken(slug, token) {
  if (!token || !UUID_RE.test(token)) return null;
  const { rows } = await pool.query(
    `SELECT * FROM providers WHERE slug = $1 AND management_token = $2`,
    [slug, token]
  );
  return rows[0] || null;
}

// Management view: provider pastes their personal token to see their own status
router.get('/:slug/manage', async (req, res, next) => {
  try {
    const p = await loadProviderByManagementToken(req.params.slug, req.query.token);
    if (!p) return res.status(403).json({ error: 'Invalid management link.' });

    const { rows: recCount } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM recommendations WHERE provider_id = $1`,
      [p.id]
    );

    res.json({
      id: p.id,
      slug: p.slug,
      first_name: p.first_name,
      surname: p.surname,
      business_name: p.business_name,
      email: p.email,
      mobile_phone: p.mobile_phone,
      whatsapp_number: p.whatsapp_number,
      business_phone: p.business_phone,
      address: p.address,
      area_covered: p.area_covered,
      service_categories: p.service_categories,
      vat_number: p.vat_number,
      companies_house_number: p.companies_house_number,
      sole_trader_utr: p.sole_trader_utr,
      years_in_business: p.years_in_business,
      affiliations: p.affiliations,
      payment_types: p.payment_types,
      payment_types_other: p.payment_types_other,
      business_size: p.business_size,
      business_size_other: p.business_size_other,
      raw_description: p.raw_description,
      raw_external_links: p.raw_external_links,
      profile_html: p.profile_html,
      status: p.status,
      enrichment_status: p.enrichment_status,
      application_deadline: p.application_deadline,
      restart_count: p.restart_count,
      restarts_remaining: Math.max(0, 2 - p.restart_count),
      application_expired: p.application_expired,
      admin_approved: p.admin_approved,
      admin_approved_at: p.admin_approved_at,
      live_at: p.live_at,
      recommendation_token: p.recommendation_token,
      recommendation_count: recCount[0].count,
      created_at: p.created_at
    });
  } catch (err) {
    next(err);
  }
});

// Restart the 72-hour application window (auth: management_token)
router.post('/:slug/restart', async (req, res, next) => {
  try {
    const p = await loadProviderByManagementToken(req.params.slug, req.body?.management_token);
    if (!p) return res.status(403).json({ error: 'Invalid management token.' });

    if (p.live_at) {
      return res.status(400).json({ error: 'Provider is already live — no restart needed.' });
    }
    if (p.application_expired) {
      return res.status(400).json({ error: 'This application has reached the maximum number of restarts.' });
    }
    if (p.restart_count >= 2) {
      return res.status(400).json({ error: 'This application has reached the maximum number of restarts.' });
    }

    const { rows: updated } = await pool.query(
      `UPDATE providers
       SET restart_count = restart_count + 1,
           application_deadline = NOW() + INTERVAL '72 hours',
           updated_at = NOW()
       WHERE id = $1
       RETURNING restart_count, application_deadline`,
      [p.id]
    );

    res.json({
      ok: true,
      restart_count: updated[0].restart_count,
      application_deadline: updated[0].application_deadline,
      restarts_remaining: 2 - updated[0].restart_count
    });
  } catch (err) {
    next(err);
  }
});

// Provider pings the admin to ask for approval (auth: management_token, rate-limited 1 per 24h)
router.post('/:slug/ping-admin', async (req, res, next) => {
  try {
    const p = await loadProviderByManagementToken(req.params.slug, req.body?.management_token);
    if (!p) return res.status(403).json({ error: 'Invalid management token.' });

    const recent = await pool.query(
      `SELECT 1 FROM admin_alerts
       WHERE provider_id = $1 AND alert_type = 'provider_ping'
         AND created_at > NOW() - INTERVAL '24 hours'
       LIMIT 1`,
      [p.id]
    );
    if (recent.rows.length > 0) {
      return res.status(429).json({ error: 'Mishelanu has already received your nudge today. We will be in touch soon.' });
    }

    await pool.query(
      `INSERT INTO admin_alerts (provider_id, alert_type, alert_message)
       VALUES ($1, 'provider_ping', $2)`,
      [p.id, `${p.first_name} ${p.surname} is asking for an approval update.`]
    );
    res.json({ ok: true, message: 'Mishelanu has been nudged — we will review your profile shortly.' });
  } catch (err) {
    next(err);
  }
});

export default router;
