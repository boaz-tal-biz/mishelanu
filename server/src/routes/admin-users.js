import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/pool.js';
import { requireSuperAdmin } from '../middleware/auth.js';
import { createAlertSafe } from '../services/alerts.js';

const router = Router();

router.use(requireSuperAdmin);

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, first_name, surname, role, is_active, last_login_at, created_at
       FROM admin_users ORDER BY created_at`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { email, password, first_name, surname, role } = req.body;
    if (!email || !password || !first_name || !surname || !role) {
      return res.status(400).json({ error: 'All fields required: email, password, first_name, surname, role' });
    }
    if (!['admin', 'monitor'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin or monitor' });
    }

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO admin_users (email, password_hash, first_name, surname, role, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, first_name, surname, role, is_active, created_at`,
      [email.toLowerCase().trim(), hash, first_name, surname, role, req.user.userId]
    );
    await createAlertSafe({ type: 'admin_user_created', metadata: { created_by: req.user.userId, role, email: email.toLowerCase().trim() } });
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { first_name, surname, role, is_active } = req.body;

    // Cannot deactivate yourself
    if (is_active === false && id === req.user.userId) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    // Cannot change a super_admin's role
    const { rows: existing } = await pool.query('SELECT role FROM admin_users WHERE id = $1', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'User not found' });
    if (existing[0].role === 'super_admin' && role && role !== 'super_admin') {
      return res.status(400).json({ error: 'Cannot change a super admin role' });
    }
    if (role && !['super_admin', 'admin', 'monitor'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const sets = [];
    const params = [];
    let i = 1;
    if (first_name !== undefined) { sets.push(`first_name = $${i++}`); params.push(first_name); }
    if (surname !== undefined) { sets.push(`surname = $${i++}`); params.push(surname); }
    if (role !== undefined) { sets.push(`role = $${i++}`); params.push(role); }
    if (is_active !== undefined) { sets.push(`is_active = $${i++}`); params.push(is_active); }

    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

    params.push(id);
    const { rows } = await pool.query(
      `UPDATE admin_users SET ${sets.join(', ')} WHERE id = $${i}
       RETURNING id, email, first_name, surname, role, is_active, last_login_at, created_at`,
      params
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    if (role && role !== existing[0].role) {
      await createAlertSafe({ type: 'admin_user_role_changed', metadata: { changed_by: req.user.userId, old_role: existing[0].role, new_role: role, email: rows[0].email } });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reset-password', async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });

    const hash = await bcrypt.hash(password, 10);
    const { rowCount } = await pool.query(
      'UPDATE admin_users SET password_hash = $1 WHERE id = $2',
      [hash, req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.user.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const { rows } = await pool.query('SELECT role FROM admin_users WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    if (rows[0].role === 'super_admin') {
      return res.status(400).json({ error: 'Cannot delete a super admin' });
    }

    await pool.query('UPDATE admin_users SET is_active = false WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
