const router    = require('express').Router();
const db        = require('../db');
const nodemailer = require('nodemailer');

// Configure transporter – uses env vars; works with Gmail / any SMTP
const createTransporter = () => nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

// POST /api/queries  – submit a customer query
router.post('/', async (req, res) => {
  try {
    const { full_name, email, phone, category, message } = req.body;
    if (!full_name || !email || !message) {
      return res.status(400).json({ error: 'full_name, email, and message are required.' });
    }

    // Save to DB
    const { rows } = await db.query(`
      INSERT INTO customer_queries (full_name, email, phone, category, message)
      VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [full_name, email, phone || null, category || null, message]);

    const query = rows[0];

    // Send email notification to store owner
    if (process.env.SMTP_USER && process.env.STORE_EMAIL) {
      try {
        const transporter = createTransporter();
        await transporter.sendMail({
          from: `"Reasonable Store Website" <${process.env.SMTP_USER}>`,
          to:   process.env.STORE_EMAIL,
          subject: `[Reasonable Store] New Query from ${full_name}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fffaf4;border-radius:12px;">
              <h2 style="color:#f4845f;">📬 New Customer Query</h2>
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px;font-weight:600;color:#6b6b6b;width:140px;">Name</td><td style="padding:8px;">${full_name}</td></tr>
                <tr style="background:#f9f0e8;"><td style="padding:8px;font-weight:600;color:#6b6b6b;">Email</td><td style="padding:8px;"><a href="mailto:${email}">${email}</a></td></tr>
                <tr><td style="padding:8px;font-weight:600;color:#6b6b6b;">Phone</td><td style="padding:8px;">${phone || '—'}</td></tr>
                <tr style="background:#f9f0e8;"><td style="padding:8px;font-weight:600;color:#6b6b6b;">Category</td><td style="padding:8px;">${category || '—'}</td></tr>
              </table>
              <div style="margin-top:16px;padding:16px;background:#fff;border-left:4px solid #f4845f;border-radius:6px;">
                <strong>Message:</strong><br/>${message.replace(/\n/g,'<br/>')}
              </div>
              <p style="color:#aaa;font-size:12px;margin-top:20px;">Query ID: ${query.id} | Received: ${new Date(query.created_at).toLocaleString()}</p>
            </div>`,
        });
        // Auto-reply to customer
        await transporter.sendMail({
          from: `"Reasonable Store" <${process.env.SMTP_USER}>`,
          to:   email,
          subject: 'We received your query – Reasonable Store',
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fffaf4;border-radius:12px;">
              <h2 style="color:#f4845f;">Thank you, ${full_name}! 🎉</h2>
              <p>We've received your query and will get back to you within <strong>24 hours</strong>.</p>
              <p style="color:#6b6b6b;">Your query reference: <code>${query.id}</code></p>
              <hr style="border:none;border-top:1px solid #eee;margin:20px 0;"/>
              <p style="font-size:13px;color:#aaa;">Reasonable Store | Your Everyday Essentials</p>
            </div>`,
        });
      } catch (mailErr) {
        console.error('Email send failed:', mailErr.message);
        // Don't fail the request just because email failed
      }
    }

    res.status(201).json({ data: query, message: 'Query submitted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/queries  (admin – list all)
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const params = [];
    let where = '';
    if (status) { where = 'WHERE status = $1'; params.push(status); }
    const offset = (parseInt(page)-1)*parseInt(limit);
    const { rows } = await db.query(
      `SELECT * FROM customer_queries ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
      [...params, limit, offset]
    );
    const count = await db.query(`SELECT COUNT(*) FROM customer_queries ${where}`, params);
    res.json({ data: rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/queries/:id/status  (admin)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const { rows } = await db.query(
      'UPDATE customer_queries SET status=$1 WHERE id=$2 RETURNING *',
      [status, req.params.id]);
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
