require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const connectDB = require('./config/db');

const app = express();

// ── Security ──
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "http://localhost:5001", "http://127.0.0.1:5001"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  }
}));
const allowedOrigins = (process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://127.0.0.1:5502').split(',').map(s=>s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return cb(null, true);
    return cb(null, false);
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(xss());
// Persistent logging in production
const fs = require('fs'); const path = require('path');
if (process.env.NODE_ENV === 'production') {
  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  const logStream = fs.createWriteStream(path.join(logDir, 'access.log'), { flags: 'a' });
  app.use(morgan('combined', { stream: logStream }));
} else {
  app.use(morgan('dev'));
}

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use('/api', limiter);

// Record write operations into the audit trail
app.use('/api', require('./middleware/audit').auditMiddleware);

// ── Health ──
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'shiloh-clinic', time: new Date().toISOString() }));

// ── Routes (phases) ──
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/roles', require('./routes/roles'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/visits', require('./routes/visits'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/admissions', require('./routes/admissions'));
app.use('/api/lab-orders', require('./routes/labOrders'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/drugs', require('./routes/drugs'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/vitals', require('./routes/vitals'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/settings', require('./routes/settings'));

// ── Serve frontend (single-service hosting: Render serves API + UI together) ──
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/services', express.static(path.join(__dirname, '..', 'services')));
app.use('/data', express.static(path.join(__dirname, '..', 'data')));
app.get('/', (req, res) => res.redirect('/login.html'));

// ── 404 + error handler ──
app.use((req, res) => res.status(404).json({ error: 'Not found: ' + req.originalUrl }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5001;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`Shiloh Clinic API running on http://localhost:${PORT}`));
}).catch(e => { console.error('DB connect failed:', e.message); process.exit(1); });
