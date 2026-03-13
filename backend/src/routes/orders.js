const router = require('express').Router();
const db     = require('../db');
const path   = require('path');
const fs     = require('fs');
const multer = require('multer');

// ── Multer for UPI screenshot upload ─────────────────────────
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/uploads';
const upiDir = path.join(UPLOAD_DIR, 'upi');
if (!fs.existsSync(upiDir)) fs.mkdirSync(upiDir, { recursive: true });

const upiUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, upiDir),
    filename:    (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `upi-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

// ── POST /api/orders  — place an order ────────────────────────
router.post('/', upiUpload.single('upi_screenshot'), async (req, res) => {
  try {
    const {
      customer_id, session_id,
      delivery_name, delivery_phone, delivery_address, delivery_city,
      payment_method, upi_txn_id, notes,
    } = req.body;

    if (!session_id && !customer_id)
      return res.status(400).json({ error: 'session_id or customer_id required' });
    if (!delivery_name || !delivery_phone || !delivery_address || !delivery_city)
      return res.status(400).json({ error: 'All delivery details are required' });
    if (!['cod','upi'].includes(payment_method))
      return res.status(400).json({ error: 'payment_method must be cod or upi' });
    if (payment_method === 'upi' && !upi_txn_id)
      return res.status(400).json({ error: 'Please enter your UPI transaction ID' });

    // Fetch cart
    const { rows: cartItems } = await db.query(
      `SELECT ci.id AS cart_id, ci.quantity,
              p.id AS product_id, p.name AS product_name,
              p.price, p.emoji, p.image_url
       FROM cart_items ci
       JOIN products p ON p.id=ci.product_id
       WHERE ci.session_id=$1`,
      [session_id]
    );
    if (!cartItems.length) return res.status(400).json({ error: 'Your cart is empty' });

    const subtotal    = cartItems.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0);
    const deliveryFee = subtotal >= 2000 ? 0 : 150;
    const total       = subtotal + deliveryFee;
    const orderNum    = `RS${Date.now().toString().slice(-9)}`;
    const screenshotFile = req.file ? req.file.filename : null;

    const { rows: [order] } = await db.query(
      `INSERT INTO orders
         (order_number, customer_id, session_id,
          delivery_name, delivery_phone, delivery_address, delivery_city,
          payment_method, payment_status, upi_txn_id, upi_screenshot,
          subtotal, delivery_fee, total, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'placed',$15)
       RETURNING *`,
      [
        orderNum,
        customer_id || null, session_id || null,
        delivery_name, delivery_phone, delivery_address, delivery_city,
        payment_method,
        payment_method === 'upi' ? 'pending_verification' : 'pending',
        upi_txn_id || null, screenshotFile,
        subtotal, deliveryFee, total,
        notes || null,
      ]
    );

    for (const item of cartItems) {
      await db.query(
        `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, emoji, image_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [order.id, item.product_id, item.product_name, item.price, item.quantity, item.emoji, item.image_url]
      );
    }

    // Clear cart
    await db.query('DELETE FROM cart_items WHERE session_id=$1', [session_id]);

    res.status(201).json({
      order,
      message: payment_method === 'cod'
        ? `Order #${orderNum} placed! Pay Rs ${total} cash on delivery.`
        : `Order #${orderNum} placed! We'll verify your UPI payment and confirm within 1–2 hours.`,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/orders/:orderNumber — track order (public) ───────
router.get('/track/:orderNumber', async (req, res) => {
  try {
    const { rows: [order] } = await db.query(
      `SELECT o.*, json_agg(oi.* ORDER BY oi.product_name) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id=o.id
       WHERE o.order_number=$1
       GROUP BY o.id`,
      [req.params.orderNumber]
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ data: order });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/orders  — admin: list all orders ─────────────────
router.get('/', async (req, res) => {
  try {
    const { status, payment_method, page=1, limit=50 } = req.query;
    const conds=[]; const params=[]; let i=1;
    if (status)         { conds.push(`o.status=$${i++}`);          params.push(status); }
    if (payment_method) { conds.push(`o.payment_method=$${i++}`);  params.push(payment_method); }
    const where  = conds.length ? 'WHERE '+conds.join(' AND ') : '';
    const offset = (parseInt(page)-1)*parseInt(limit);

    const { rows } = await db.query(
      `SELECT o.*, c.full_name AS customer_name, c.email AS customer_email,
              json_agg(oi.* ORDER BY oi.product_name) AS items
       FROM orders o
       LEFT JOIN customers c ON c.id=o.customer_id
       LEFT JOIN order_items oi ON oi.order_id=o.id
       ${where}
       GROUP BY o.id, c.full_name, c.email
       ORDER BY o.created_at DESC
       LIMIT $${i} OFFSET $${i+1}`,
      [...params, limit, offset]
    );
    const { rows:[{count}] } = await db.query(`SELECT COUNT(*) FROM orders o ${where}`, params);
    res.json({ data: rows, total: parseInt(count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /api/orders/:orderNumber/status  — admin update ─────
router.patch('/:orderNumber/status', async (req, res) => {
  try {
    const { status, payment_status } = req.body;
    const fields=[]; const params=[]; let i=1;
    if (status)         { fields.push(`status=$${i++}`);         params.push(status); }
    if (payment_status) { fields.push(`payment_status=$${i++}`); params.push(payment_status); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    params.push(req.params.orderNumber);
    const { rows:[o] } = await db.query(
      `UPDATE orders SET ${fields.join(',')} WHERE order_number=$${i} RETURNING *`, params
    );
    if (!o) return res.status(404).json({ error: 'Order not found' });
    res.json({ data: o });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
