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
      `SELECT a.*,
         (p.first_name || ' ' || p.surname) AS provider_name
       FROM admin_alerts a
       LEFT JOIN providers p ON a.provider_id = p.id
       WHERE a.dismissed = false
       ORDER BY
         CASE a.alert_type
           WHEN 'approval_ready' THEN 1
           WHEN 'new_registration' THEN 2
           WHEN 'provider_ping' THEN 3
           WHEN 'contact_message' THEN 4
           WHEN 'deadline_warning' THEN 5
           WHEN 'application_expired' THEN 6
           WHEN 'category_suggestion' THEN 7
           WHEN 'missing_recommendations' THEN 8
           WHEN 'renewal_due' THEN 9
           ELSE 10
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
    const { status } = req.query;
    const params = [];
    let where = '';
    if (status) {
      params.push(status);
      where = `WHERE c.status = $1`;
    }
    const { rows } = await pool.query(
      `SELECT c.id, c.category, c.subcategory, c.status, c.suggested_by_provider_id, c.created_at,
              (p.first_name || ' ' || p.surname) AS suggested_by_name,
              COALESCE(
                (SELECT json_agg(json_build_object('id', a.id, 'alias', a.alias) ORDER BY a.alias)
                 FROM category_aliases a WHERE a.category_id = c.id),
                '[]'::json
              ) AS aliases
       FROM service_categories_registry c
       LEFT JOIN providers p ON c.suggested_by_provider_id = p.id
       ${where}
       ORDER BY c.category, c.subcategory`,
      params
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

router.patch('/categories/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'deactivated', 'suggested'].includes(status)) {
      return res.status(400).json({ error: "status must be 'active', 'deactivated', or 'suggested'" });
    }
    const { rows } = await pool.query(
      `UPDATE service_categories_registry SET status = $1 WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Category not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/categories/:id/aliases', requireAdmin, async (req, res, next) => {
  try {
    const { alias } = req.body;
    if (!alias || !alias.trim()) return res.status(400).json({ error: 'alias required' });
    const normalised = alias.trim().toLowerCase();
    const { rows } = await pool.query(
      `INSERT INTO category_aliases (alias, category_id) VALUES ($1, $2) RETURNING *`,
      [normalised, req.params.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'That alias already exists.' });
    if (err.code === '23503') return res.status(404).json({ error: 'Category not found' });
    next(err);
  }
});

router.delete('/categories/:categoryId/aliases/:aliasId', requireAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM category_aliases WHERE id = $1 AND category_id = $2`,
      [req.params.aliasId, req.params.categoryId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Alias not found for that category' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/categories/:id/make-alias', requireAdmin, async (req, res, next) => {
  try {
    const { target_category_id } = req.body;
    if (!target_category_id) return res.status(400).json({ error: 'target_category_id required' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const src = await client.query(
        `SELECT id, subcategory, status FROM service_categories_registry WHERE id = $1`,
        [req.params.id]
      );
      if (src.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Source category not found' });
      }
      const target = await client.query(
        `SELECT id, status FROM service_categories_registry WHERE id = $1`,
        [target_category_id]
      );
      if (target.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Target category not found' });
      }
      if (target.rows[0].status !== 'active') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Target category must be active to receive aliases.' });
      }
      if (src.rows[0].id === target.rows[0].id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Cannot alias a category to itself.' });
      }

      const aliasText = src.rows[0].subcategory.trim().toLowerCase();
      await client.query(
        `INSERT INTO category_aliases (alias, category_id)
         VALUES ($1, $2)
         ON CONFLICT (alias) DO UPDATE SET category_id = EXCLUDED.category_id`,
        [aliasText, target_category_id]
      );

      // Re-point any existing aliases that pointed at the source
      await client.query(
        `UPDATE category_aliases SET category_id = $1 WHERE category_id = $2`,
        [target_category_id, req.params.id]
      );

      await client.query(
        `UPDATE service_categories_registry SET status = 'deactivated' WHERE id = $1`,
        [req.params.id]
      );
      await client.query('COMMIT');
      res.json({ ok: true, alias: aliasText, target_category_id });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
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
      where.push(`(p.first_name ILIKE $${i} OR p.surname ILIKE $${i} OR p.business_name ILIKE $${i} OR p.raw_description ILIKE $${i})`);
      params.push(`%${search}%`);
      i++;
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT p.*,
        (p.first_name || ' ' || p.surname) AS full_name,
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
        (p.first_name || ' ' || p.surname) AS full_name,
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
      'first_name', 'surname', 'business_name', 'address', 'area_covered',
      'mobile_phone', 'whatsapp_number', 'business_phone', 'email',
      'service_categories', 'raw_description', 'raw_external_links',
      'parsed_profile', 'parsed_categories_suggestion', 'profile_html',
      'enrichment_status', 'vat_number', 'companies_house_number',
      'sole_trader_utr', 'years_in_business', 'affiliations'
    ];

    const sets = [];
    const params = [];
    let i = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        if (key === 'parsed_profile') {
          sets.push(`${key} = $${i++}::jsonb`);
          params.push(JSON.stringify(fields[key]));
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

// Admin approval (go-live gate)
router.post('/providers/:id/approve', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE providers
       SET admin_approved = true,
           admin_approved_at = COALESCE(admin_approved_at, NOW()),
           live_at = CASE
             WHEN enrichment_status IN ('processed', 'reviewed') AND live_at IS NULL THEN NOW()
             ELSE live_at
           END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, admin_approved, admin_approved_at, live_at, enrichment_status`,
      [req.params.id]
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
      `SELECT first_name, surname, business_name, live_at FROM providers WHERE id = $1`,
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
      provider_name: `${provider.first_name} ${provider.surname}`,
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
      `SELECT first_name, surname, business_name, live_at FROM providers WHERE id = $1`,
      [req.params.id]
    );
    if (provRows.length === 0) return res.status(404).json({ error: 'Provider not found' });
    const provider = provRows[0];
    const providerName = `${provider.first_name} ${provider.surname}`;

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
    res.setHeader('Content-Disposition', `attachment; filename="mishelanu-report-${providerName.replace(/\s+/g, '-')}.pdf"`);
    doc.pipe(res);

    doc.fontSize(20).fillColor('#1a2744').text('Mishelanu', { align: 'center' });
    doc.fontSize(12).fillColor('#666').text('Provider Activity Report', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(14).fillColor('#1a2744').text(providerName);
    if (provider.business_name) doc.fontSize(11).fillColor('#333').text(provider.business_name);
    doc.fontSize(10).fillColor('#666').text(`Live since: ${provider.live_at ? new Date(provider.live_at).toLocaleDateString('en-GB') : 'Not yet live'}`);
    doc.text(`Report period: ${since.toLocaleDateString('en-GB')} — ${new Date().toLocaleDateString('en-GB')}`);
    doc.moveDown(2);

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
      `SELECT sr.*, (p.first_name || ' ' || p.surname) AS matched_provider_name
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
      `SELECT sr.*, (p.first_name || ' ' || p.surname) AS matched_provider_name
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
