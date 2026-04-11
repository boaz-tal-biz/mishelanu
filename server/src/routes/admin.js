import { Router } from 'express';
import { loginAdmin, logoutAdmin, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/login', loginAdmin);
router.post('/logout', logoutAdmin);
router.get('/check', requireAdmin, (req, res) => res.json({ ok: true }));

// More admin routes added in Phase 4

export default router;
