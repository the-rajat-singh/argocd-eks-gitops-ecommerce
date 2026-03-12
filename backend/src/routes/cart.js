const router = require('express').Router();
const db     = require('../db');

// GET /api/cart/:sessionId
router.get('/:sessionId', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT ci.*, p.name, p.price, p.emoji, p.bg_color, p.category_id
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.session_id = $1
      ORDER BY ci.created_at`, [req.params.sessionId]);
    const total = rows.reduce((s, r) => s + parseFloat(r.price) * r.quantity, 0);
    res.json({ data: rows, total: total.toFixed(2), count: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cart  – add item
router.post('/', async (req, res) => {
  try {
    const { session_id, product_id, quantity = 1 } = req.body;
    // Upsert
    const existing = await db.query(
      'SELECT id, quantity FROM cart_items WHERE session_id=$1 AND product_id=$2',
      [session_id, product_id]);
    let row;
    if (existing.rows.length) {
      const res2 = await db.query(
        'UPDATE cart_items SET quantity=$1 WHERE id=$2 RETURNING *',
        [existing.rows[0].quantity + parseInt(quantity), existing.rows[0].id]);
      row = res2.rows[0];
    } else {
      const res2 = await db.query(
        'INSERT INTO cart_items (session_id, product_id, quantity) VALUES ($1,$2,$3) RETURNING *',
        [session_id, product_id, quantity]);
      row = res2.rows[0];
    }
    res.status(201).json({ data: row });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/cart/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM cart_items WHERE id=$1', [req.params.id]);
    res.json({ message: 'Removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/cart/session/:sessionId  – clear cart
router.delete('/session/:sessionId', async (req, res) => {
  try {
    await db.query('DELETE FROM cart_items WHERE session_id=$1', [req.params.sessionId]);
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
