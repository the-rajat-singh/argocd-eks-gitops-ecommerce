const router = require('express').Router();
const db     = require('../db');

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT c.*, COUNT(p.id) AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id ORDER BY c.id`);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/categories/:slug
router.get('/:slug', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM categories WHERE slug = $1', [req.params.slug]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
