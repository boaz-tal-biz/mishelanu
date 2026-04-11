import { Router } from 'express';
import { loginAdmin, logoutAdmin, requireAdmin } from '../middleware/auth.js';
import pool from '../db/pool.js';
import PDFDocument from 'pdfkit';

const router = Router();

// Auth
router.post('/login', loginAdmin);
router.post('/logout', logoutAdmin);
router.get('/check', requireAdmin, (req, res) => res.json({ ok: true }));

// --- Alerts ---

router.get('/alerts', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.*, p.full_name AS provider_name
       FROM admin_alerts a
       LEFT JOIN providers p ON a.provider_id = p.id
       WHERE a.dismissed = false
       ORDER BY
         CASE a.alert_type
           WHEN 'new_registration' THEN 1
           WHEN 'category_suggestion' THEN 2
           WHEN 'missing_recommendations' THEN 3
           WHEN 'renewal_due' THEN 4
         END,
         a.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/alerts/:id/dismiss', requireAdmin, async (req, res, next) => {
  try {
    await pool.query(`UPDATE admin_alerts SET dismissed = true WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --- Categories ---

router.get('/categories', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, p.full_name AS suggested_by_name
       FROM service_categories_registry c
       LEFT JOIN providers p ON c.suggested_by_provider_id = p.id
       ORDER BY c.category, c.subcategory`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/categories', requireAdmin, async (req, res, next) => {
  try {
    const { category, subcategory } = req.body;
    if (!category || !subcategory) {
      return res.status(400).json({ error: 'category and subcategory required' });
    }
    const { rows } = await pool.query(
      `INSERT INTO service_categories_registry (category, subcategory, status)
       VALUES ($1, $2, 'active') RETURNING *`,
      [category, subcategory]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/categories/:id', requireAdmin, async (req, res, next) => {
  try {
    const { category, subcategory, status } = req.body;
    const { rows } = await pool.query(
      `UPDATE service_categories_registry
       SET category = COALESCE($1, category),
           subcategory = COALESCE($2, subcategory),
           status = COALESCE($3, status)
       WHERE id = $4 RETURNING *`,
      [category, subcategory, status, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Category not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/categories/:id/approve', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE service_categories_registry SET status = 'active' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Category not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// --- Providers ---

router.get('/providers', requireAdmin, async (req, res, next) => {
  try {
    const { status, enrichment_status, category, search } = req.query;
    let where = [];
    let params = [];
    let i = 1;

    if (status) { where.push(`p.status = $${i++}`); params.push(status); }
    if (enrichment_status) { where.push(`p.enrichment_status = $${i++}`); params.push(enrichment_status); }
    if (category) { where.push(`$${i++} = ANY(p.service_categories)`); params.push(category); }
    if (search) {
      where.push(`(p.full_name ILIKE $${i} OR p.business_name ILIKE $${i} OR p.raw_description ILIKE $${i})`);
      params.push(`%${search}%`);
      i++;
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT p.*,
        (SELECT COUNT(*)::int FROM recommendations WHERE provider_id = p.id) AS recommendation_count,
        (SELECT COUNT(*)::int FROM profile_visits WHERE provider_id = p.id) AS total_visits,
        (SELECT COUNT(*)::int FROM profile_visits WHERE provider_id = p.id AND service_request_id IS NOT NULL) AS matched_visits,
        (SELECT COUNT(*)::int FROM outbound_messages WHERE provider_id = p.id AND message_type = 'provider_opportunity') AS leads_sent
       FROM providers p
       ${whereClause}
       ORDER BY p.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/providers/:id', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*,
        (SELECT COUNT(*)::int FROM recommendations WHERE provider_id = p.id) AS recommendation_count,
        (SELECT COUNT(*)::int FROM profile_visits WHERE provider_id = p.id) AS total_visits,
        (SELECT COUNT(*)::int FROM profile_visits WHERE provider_id = p.id AND service_request_id IS NOT NULL) AS matched_visits,
        (SELECT COUNT(*)::int FROM outbound_messages WHERE provider_id = p.id AND message_type = 'provider_opportunity') AS leads_sent
       FROM providers p WHERE p.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Provider not found' });

    const provider = rows[0];

    const { rows: recs } = await pool.query(
      `SELECT * FROM recommendations WHERE provider_id = $1 ORDER BY created_at`, [provider.id]
    );

    res.json({ ...provider, recommendations: recs });
  } catch (err) {
    next(err);
  }
});

router.put('/providers/:id', requireAdmin, async (req, res, next) => {
  try {
    const fields = req.body;
    const allowed = [
      'full_name', 'business_name', 'address', 'mobile_phone', 'whatsapp_number',
      'business_phone', 'email', 'service_categories', 'raw_description',
      'raw_external_links', 'parsed_profile', 'parsed_categories_suggestion',
      'profile_html', 'enrichment_status'
    ];

    const sets = [];
    const params = [];
    let i = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        if (key === 'parsed_profile') {
          sets.push(`${key} = $${i++}::jsonb`);
          params.push(JSON.stringify(fields[key]));
        } else if (key === 'service_categories' || key === 'parsed_categories_suggestion') {
          sets.push(`${key} = $${i++}`);
          params.push(fields[key]);
        } else {
          sets.push(`${key} = $${i++}`);
          params.push(fields[key]);
        }
      }
    }

    if (sets.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    sets.push(`updated_at = NOW()`);
    params.push(req.params.id);

    const { rows } = await pool.query(
      `UPDATE providers SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      params
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Provider not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Status actions
router.post('/providers/:id/suspend', requireAdmin, async (req, res, next) => {
  try {
    const { reason } = req.body;
    const { rows } = await pool.query(
      `UPDATE providers SET status = 'suspended', suspension_reason = $1, updated_at = NOW()
       WHERE id = $2 RETURNING id, status`,
      [reason || null, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Provider not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/providers/:id/awaiting-payment', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE providers SET status = 'awaiting_payment', updated_at = NOW()
       WHERE id = $1 RETURNING id, status`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Provider not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/providers/:id/delete', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE providers SET status = 'deleted', updated_at = NOW()
       WHERE id = $1 RETURNING id, status`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Provider not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/providers/:id/reactivate', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE providers SET status = 'active', suspension_reason = NULL, updated_at = NOW()
       WHERE id = $1 RETURNING id, status`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Provider not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// --- Activity Report ---

router.get('/providers/:id/report', requireAdmin, async (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const { rows: provRows } = await pool.query(
      `SELECT full_name, business_name, live_at FROM providers WHERE id = $1`,
      [req.params.id]
    );
    if (provRows.length === 0) return res.status(404).json({ error: 'Provider not found' });
    const provider = provRows[0];

    const stats = await pool.query(
      `SELECT
        (SELECT COUNT(*)::int FROM profile_visits WHERE provider_id = $1 AND visited_at >= $2) AS total_visits,
        (SELECT COUNT(*)::int FROM profile_visits WHERE provider_id = $1 AND visited_at >= $2 AND service_request_id IS NOT NULL) AS matched_visits,
        (SELECT COUNT(*)::int FROM outbound_messages WHERE provider_id = $1 AND sent_at >= $2 AND message_type = 'provider_opportunity') AS requests_sent,
        (SELECT COUNT(*)::int FROM service_requests WHERE matched_provider_id = $1 AND created_at >= $2 AND status = 'provider_interested') AS interested_count,
        (SELECT COUNT(*)::int FROM recommendations WHERE provider_id = $1) AS recommendation_count`,
      [req.params.id, since.toISOString()]
    );

    res.json({
      provider_name: provider.full_name,
      business_name: provider.business_name,
      live_since: provider.live_at,
      period_months: months,
      period_start: since.toISOString(),
      ...stats.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

// PDF export of activity report
router.get('/providers/:id/report/pdf', requireAdmin, async (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const { rows: provRows } = await pool.query(
      `SELECT full_name, business_name, live_at FROM providers WHERE id = $1`,
      [req.params.id]
    );
    if (provRows.length === 0) return res.status(404).json({ error: 'Provider not found' });
    const provider = provRows[0];

    const stats = await pool.query(
      `SELECT
        (SELECT COUNT(*)::int FROM profile_visits WHERE provider_id = $1 AND visited_at >= $2) AS total_visits,
        (SELECT COUNT(*)::int FROM profile_visits WHERE provider_id = $1 AND visited_at >= $2 AND service_request_id IS NOT NULL) AS matched_visits,
        (SELECT COUNT(*)::int FROM outbound_messages WHERE provider_id = $1 AND sent_at >= $2 AND message_type = 'provider_opportunity') AS requests_sent,
        (SELECT COUNT(*)::int FROM service_requests WHERE matched_provider_id = $1 AND created_at >= $2 AND status = 'provider_interested') AS interested_count,
        (SELECT COUNT(*)::int FROM recommendations WHERE provider_id = $1) AS recommendation_count`,
      [req.params.id, since.toISOString()]
    );
    const s = stats.rows[0];

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="mishelanu-report-${provider.full_name.replace(/\s+/g, '-')}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).fillColor('#1a2744').text('Mishelanu', { align: 'center' });
    doc.fontSize(12).fillColor('#666').text('Provider Activity Report', { align: 'center' });
    doc.moveDown(2);

    // Provider info
    doc.fontSize(14).fillColor('#1a2744').text(provider.full_name);
    if (provider.business_name) doc.fontSize(11).fillColor('#333').text(provider.business_name);
    doc.fontSize(10).fillColor('#666').text(`Live since: ${provider.live_at ? new Date(provider.live_at).toLocaleDateString('en-GB') : 'Not yet live'}`);
    doc.text(`Report period: ${since.toLocaleDateString('en-GB')} — ${new Date().toLocaleDateString('en-GB')}`);
    doc.moveDown(2);

    // Stats
    const lines = [
      ['Total profile page visits', s.total_visits],
      ['Visits from Mishelanu matches', s.matched_visits],
      ['Service requests sent', s.requests_sent],
      ['Provider replied interested', s.interested_count],
      ['Recommendations received', s.recommendation_count],
    ];

    for (const [label, value] of lines) {
      doc.fontSize(11).fillColor('#333').text(`${label}:`, 50, doc.y, { continued: true });
      doc.fillColor('#1a2744').text(`  ${value}`);
      doc.moveDown(0.5);
    }

    doc.moveDown(2);
    doc.fontSize(9).fillColor('#999').text('Generated by Mishelanu — Community Service Provider Registry', { align: 'center' });

    doc.end();
  } catch (err) {
    next(err);
  }
});

// --- Service Requests Log ---

router.get('/requests', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT sr.*, p.full_name AS matched_provider_name
       FROM service_requests sr
       LEFT JOIN providers p ON sr.matched_provider_id = p.id
       ORDER BY sr.created_at DESC
       LIMIT 200`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/requests/:id', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT sr.*, p.full_name AS matched_provider_name
       FROM service_requests sr
       LEFT JOIN providers p ON sr.matched_provider_id = p.id
       WHERE sr.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
