require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const path    = require('path');
const fs      = require('fs');

const db = require('./db');

const app  = express();
const PORT = process.env.PORT || 5000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/uploads';

// Ensure upload dirs exist
['products','gallery','upi'].forEach(d => {
  const dir = path.join(UPLOAD_DIR, d);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || '*', methods: ['GET','POST','PUT','DELETE','PATCH'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOAD_DIR));

app.use('/api/health',     require('./routes/health'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products',   require('./routes/products'));
app.use('/api/queries',    require('./routes/queries'));
app.use('/api/gallery',    require('./routes/gallery'));
app.use('/api/cart',       require('./routes/cart'));
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/orders',     require('./routes/orders'));

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => { console.error(err.stack); res.status(500).json({ error: err.message }); });

async function start() {
  await db.query('SELECT 1');
  console.log('✅ Database connected');
  app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
}
start().catch(err => { console.error('❌ Startup failed:', err.message); process.exit(1); });
