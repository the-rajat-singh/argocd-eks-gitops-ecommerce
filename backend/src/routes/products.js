const router = require('express').Router();
const db     = require('../db');

// GET /api/products?category=&featured=&search=&page=&limit=
router.get('/', async (req, res) => {
  try {
    const { category, featured, search, page = 1, limit = 20 } = req.query;
    const conditions = [];
    const params = [];
    let i = 1;

    if (category && category !== 'all') {
      conditions.push(`c.slug = $${i++}`);
      params.push(category);
    }
    if (featured === 'true') {
      conditions.push(`p.is_featured = true`);
    }
    if (search) {
      conditions.push(`(p.name ILIKE $${i} OR p.description ILIKE $${i})`);
      params.push(`%${search}%`); i++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows } = await db.query(`
      SELECT p.*, c.name AS category_name, c.slug AS category_slug
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ${where}
      ORDER BY p.is_featured DESC, p.created_at DESC
      LIMIT $${i} OFFSET $${i+1}`,
      [...params, limit, offset]
    );

    const countRes = await db.query(
      `SELECT COUNT(*) FROM products p LEFT JOIN categories c ON c.id = p.category_id ${where}`,
      params
    );

    res.json({
      data: rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT p.*, c.name AS category_name, c.slug AS category_slug
      FROM products p LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products  (admin)
router.post('/', async (req, res) => {
  try {
    const { name, description, price, original_price, category_id,
            emoji, badge, bg_color, stock, is_featured } = req.body;
    const { rows } = await db.query(`
      INSERT INTO products (name, description, price, original_price, category_id,
        emoji, badge, bg_color, stock, is_featured)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, description, price, original_price || null, category_id,
       emoji || '📦', badge || null, bg_color || '#f5ece0',
       stock || 100, is_featured || false]);
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id (admin)
router.put('/:id', async (req, res) => {
  try {
    const { name, description, price, original_price, emoji,
            badge, bg_color, stock, is_featured } = req.body;
    const { rows } = await db.query(`
      UPDATE products SET
        name=$1, description=$2, price=$3, original_price=$4,
        emoji=$5, badge=$6, bg_color=$7, stock=$8, is_featured=$9
      WHERE id=$10 RETURNING *`,
      [name, description, price, original_price || null,
       emoji, badge || null, bg_color, stock, is_featured, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id (admin)
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM products WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
