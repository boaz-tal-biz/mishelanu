import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, category, subcategory, status
       FROM service_categories_registry
       WHERE status = 'active'
       ORDER BY category, subcategory`
    );
    // Group by category
    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.category]) grouped[row.category] = [];
      grouped[row.category].push({ id: row.id, subcategory: row.subcategory });
    }
    res.json(grouped);
  } catch (err) {
    next(err);
  }
});

export default router;
