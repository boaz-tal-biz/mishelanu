import { Router } from 'express';
const router = Router();

// Stubs — implemented in Phase 2
router.get('/:token', (req, res) => res.status(501).json({ error: 'Not yet implemented' }));
router.post('/:token', (req, res) => res.status(501).json({ error: 'Not yet implemented' }));

export default router;
