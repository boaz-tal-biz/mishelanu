import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

// Public contact form → creates a contact_message alert for admin
router.post('/', async (req, res, next) => {
  try {
    const { name, email, phone, message, subject, provider_slug } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'name, email, and message are required' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message must be 2000 characters or fewer.' });
    }

    let providerId = null;
    if (provider_slug) {
      const { rows } = await pool.query(
        `SELECT id FROM providers WHERE slug = $1`,
        [provider_slug]
      );
      if (rows.length > 0) providerId = rows[0].id;
    }

    const summary = `Contact from ${name} (${email}${phone ? `, ${phone}` : ''})`;

    await pool.query(
      `INSERT INTO admin_alerts (provider_id, alert_type, alert_message, metadata)
       VALUES ($1, 'contact_message', $2, $3)`,
      [
        providerId,
        summary,
        JSON.stringify({ name, email, phone: phone || null, message, subject: subject || null, provider_slug: provider_slug || null })
      ]
    );

    res.status(201).json({ ok: true, message: 'Toda raba — Mishelanu has received your message and will be in touch soon.' });
  } catch (err) {
    next(err);
  }
});

export default router;
