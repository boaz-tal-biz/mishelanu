import { Router } from 'express';
const router = Router();

// Stubs — implemented in Phase 2
router.post('/', (req, res) => res.status(501).json({ error: 'Not yet implemented' }));
router.get('/:slug', (req, res) => res.status(501).json({ error: 'Not yet implemented' }));

export default router;
