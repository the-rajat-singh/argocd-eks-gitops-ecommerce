const router = require('express').Router();
const db     = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() as time');
    res.json({ status: 'healthy', db: 'connected', time: result.rows[0].time });
  } catch {
    res.status(500).json({ status: 'unhealthy', db: 'disconnected' });
  }
});

module.exports = router;
