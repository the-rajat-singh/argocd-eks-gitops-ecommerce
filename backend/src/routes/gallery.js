const router  = require('express').Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');
const db      = require('../db');

// Ensure uploads directory exists
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// GET /api/gallery
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM gallery_photos ORDER BY created_at DESC');
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gallery/upload
router.post('/upload', upload.array('photos', 20), async (req, res) => {
  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
    const inserted = [];
    for (const file of req.files) {
      const url = `${BASE_URL}/uploads/${file.filename}`;
      const label = req.body.label || file.originalname.replace(/\.[^.]+$/, '');
      const { rows } = await db.query(`
        INSERT INTO gallery_photos (filename, original_name, url, label)
        VALUES ($1,$2,$3,$4) RETURNING *`,
        [file.filename, file.originalname, url, label]);
      inserted.push(rows[0]);
    }
    res.status(201).json({ data: inserted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/gallery/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'DELETE FROM gallery_photos WHERE id=$1 RETURNING *', [req.params.id]);
    if (rows.length) {
      const filePath = path.join(UPLOAD_DIR, rows[0].filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
