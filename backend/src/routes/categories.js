const router = require('express').Router();
const db     = require('../db');

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*, COUNT(p.id) AS product_count
       FROM categories c LEFT JOIN products p ON p.category_id=c.id
       GROUP BY c.id ORDER BY c.id`
    );
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/categories/:slug
router.get('/:slug', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM categories WHERE slug=$1', [req.params.slug]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ data: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/categories  (admin)
router.post('/', async (req, res) => {
  try {
    const { name, icon, description, color_class } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const slug = name.toLowerCase().replace(/[^a-z0-9\s]/g,'').trim().replace(/\s+/g,'-');
    const { rows } = await db.query(
      `INSERT INTO categories (name, slug, icon, description, color_class)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name.trim(), slug, icon||'🛍️', description||'', color_class||'c1']
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    if (err.code==='23505') return res.status(400).json({ error: 'Category name already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/categories/:id  (admin)
router.put('/:id', async (req, res) => {
  try {
    const { name, icon, description, color_class } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9\s]/g,'').trim().replace(/\s+/g,'-');
    const { rows } = await db.query(
      `UPDATE categories SET name=$1, slug=$2, icon=$3, description=$4, color_class=$5
       WHERE id=$6 RETURNING *`,
      [name.trim(), slug, icon||'🛍️', description||'', color_class||'c1', req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ data: rows[0] });
  } catch (err) {
    if (err.code==='23505') return res.status(400).json({ error: 'Category name already exists' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/categories/:id  (admin)
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT COUNT(*) FROM products WHERE category_id=$1', [req.params.id]);
    if (parseInt(rows[0].count) > 0)
      return res.status(400).json({ error: `${rows[0].count} products use this category — reassign them first` });
    await db.query('DELETE FROM categories WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
