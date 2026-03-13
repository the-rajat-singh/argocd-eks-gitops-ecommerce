const router = require('express').Router();
const db     = require('../db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// ── Middleware: require valid token ───────────────────────────
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Login required' });
  try {
    const { rows } = await db.query(
      `SELECT c.* FROM customers c
       JOIN auth_tokens t ON t.customer_id = c.id
       WHERE t.token=$1 AND t.expires_at > NOW()`,
      [token]
    );
    if (!rows.length) return res.status(401).json({ error: 'Session expired, please login again' });
    req.customer = rows[0];
    next();
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// ── POST /api/auth/register ───────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password, phone } = req.body;
    if (!full_name?.trim() || !email?.trim() || !password)
      return res.status(400).json({ error: 'Full name, email and password are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      `INSERT INTO customers (full_name, email, password_hash, phone)
       VALUES ($1,$2,$3,$4)
       RETURNING id, full_name, email, phone, city, province, address_line1, address_line2, postal_code, country, created_at`,
      [full_name.trim(), email.toLowerCase().trim(), hash, phone?.trim() || null]
    );
    const customer = rows[0];
    const token = crypto.randomBytes(48).toString('hex');
    await db.query(
      `INSERT INTO auth_tokens (customer_id, token, expires_at)
       VALUES ($1,$2, NOW()+INTERVAL '30 days')`,
      [customer.id, token]
    );
    res.status(201).json({ customer, token });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'An account with this email already exists' });
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const { rows } = await db.query('SELECT * FROM customers WHERE email=$1', [email.toLowerCase().trim()]);
    if (!rows.length) return res.status(401).json({ error: 'No account found with this email' });
    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Incorrect password' });
    const token = crypto.randomBytes(48).toString('hex');
    await db.query(
      `INSERT INTO auth_tokens (customer_id, token, expires_at)
       VALUES ($1,$2, NOW()+INTERVAL '30 days')`,
      [rows[0].id, token]
    );
    const { password_hash, ...customer } = rows[0];
    res.json({ customer, token });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/auth/logout ─────────────────────────────────────
router.post('/logout', requireAuth, async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  await db.query('DELETE FROM auth_tokens WHERE token=$1', [token]);
  res.json({ message: 'Logged out' });
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  const { password_hash, ...safe } = req.customer;
  res.json({ customer: safe });
});

// ── PUT /api/auth/profile  — update name/phone/address ────────
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { full_name, phone, address_line1, address_line2, city, province, postal_code, country } = req.body;
    const { rows } = await db.query(
      `UPDATE customers
       SET full_name=$1, phone=$2, address_line1=$3, address_line2=$4,
           city=$5, province=$6, postal_code=$7, country=$8
       WHERE id=$9
       RETURNING id, full_name, email, phone,
                 address_line1, address_line2, city, province, postal_code, country`,
      [
        full_name || req.customer.full_name,
        phone     || null,
        address_line1 || null, address_line2 || null,
        city      || null, province || null, postal_code || null,
        country   || 'Pakistan',
        req.customer.id,
      ]
    );
    res.json({ customer: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT /api/auth/password ────────────────────────────────────
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password)
      return res.status(400).json({ error: 'Both current and new password required' });
    if (new_password.length < 6)
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    const { rows } = await db.query('SELECT password_hash FROM customers WHERE id=$1', [req.customer.id]);
    if (!await bcrypt.compare(current_password, rows[0].password_hash))
      return res.status(401).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(new_password, 12);
    await db.query('UPDATE customers SET password_hash=$1 WHERE id=$2', [hash, req.customer.id]);
    res.json({ message: 'Password updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/auth/orders  — customer's own orders ─────────────
router.get('/orders', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT o.*, json_agg(oi.* ORDER BY oi.product_name) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id=o.id
       WHERE o.customer_id=$1
       GROUP BY o.id ORDER BY o.created_at DESC`,
      [req.customer.id]
    );
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
module.exports.requireAuth = requireAuth;
