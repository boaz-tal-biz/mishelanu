import crypto from 'crypto';

const sessions = new Set();

export function loginAdmin(req, res) {
  const { password } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  sessions.add(token);
  res.cookie('admin_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.json({ ok: true });
}

export function logoutAdmin(req, res) {
  const token = req.cookies?.admin_session;
  if (token) sessions.delete(token);
  res.clearCookie('admin_session');
  res.json({ ok: true });
}

export function requireAdmin(req, res, next) {
  const token = req.cookies?.admin_session;
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}
