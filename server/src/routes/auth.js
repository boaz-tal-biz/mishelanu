import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/pool.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { rows } = await pool.query(
      'SELECT id, email, password_hash, first_name, surname, role, is_active FROM admin_users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await pool.query('UPDATE admin_users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const token = signToken(user);
    res.json({
      token,
      user: { id: user.id, email: user.email, first_name: user.first_name, surname: user.surname, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, first_name, surname, role FROM admin_users WHERE id = $1 AND is_active = true',
      [req.user.userId]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'User not found or deactivated' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
