const router  = require('express').Router();
const db      = require('../db');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/uploads';
const prodDir = path.join(UPLOAD_DIR, 'products');
if (!fs.existsSync(prodDir)) fs.mkdirSync(prodDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, prodDir),
    filename:    (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `prod-${Date.now()}-${Math.floor(Math.random()*9999)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Images only'));
  },
});

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const { category, featured, search, page=1, limit=20 } = req.query;
    const conds=[]; const params=[]; let i=1;
    if (category && category !== 'all') { conds.push(`c.slug=$${i++}`); params.push(category); }
    if (featured === 'true') conds.push('p.is_featured=true');
    if (search) { conds.push(`(p.name ILIKE $${i} OR p.description ILIKE $${i})`); params.push(`%${search}%`); i++; }
    const where  = conds.length ? 'WHERE '+conds.join(' AND ') : '';
    const offset = (parseInt(page)-1)*parseInt(limit);
    const { rows } = await db.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p LEFT JOIN categories c ON c.id=p.category_id
       ${where} ORDER BY p.is_featured DESC, p.created_at DESC
       LIMIT $${i} OFFSET $${i+1}`,
      [...params, limit, offset]
    );
    const { rows:[{count}] } = await db.query(
      `SELECT COUNT(*) FROM products p LEFT JOIN categories c ON c.id=p.category_id ${where}`, params
    );
    res.json({ data: rows, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p LEFT JOIN categories c ON c.id=p.category_id
       WHERE p.id=$1`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ data: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/products  (multipart — image optional)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, original_price, category_id,
            emoji, badge, bg_color, stock, is_featured } = req.body;
    const image_url = req.file ? `/uploads/products/${req.file.filename}` : null;
    const { rows } = await db.query(
      `INSERT INTO products (name, description, price, original_price, category_id,
         emoji, badge, bg_color, stock, is_featured, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [name, description, price, original_price||null, category_id||null,
       emoji||'📦', badge||null, bg_color||'#f5ece0', stock||100, is_featured||false, image_url]
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/products/:id  (multipart — new image optional)
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, original_price, category_id,
            emoji, badge, bg_color, stock, is_featured } = req.body;
    let imgClause = ''; const extra = [];
    if (req.file) { imgClause = ', image_url=$12'; extra.push(`/uploads/products/${req.file.filename}`); }
    const { rows } = await db.query(
      `UPDATE products SET
         name=$1, description=$2, price=$3, original_price=$4, category_id=$5,
         emoji=$6, badge=$7, bg_color=$8, stock=$9, is_featured=$10, updated_at=NOW()${imgClause}
       WHERE id=$11 RETURNING *`,
      [name, description, price, original_price||null, category_id||null,
       emoji, badge||null, bg_color, stock, is_featured, ...extra, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ data: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT image_url FROM products WHERE id=$1', [req.params.id]);
    if (rows[0]?.image_url) {
      const p = path.join(UPLOAD_DIR, rows[0].image_url.replace('/uploads',''));
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    await db.query('DELETE FROM products WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
