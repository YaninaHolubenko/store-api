// server.js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const compression = require('compression'); 

const googleAuthRouter = require('./routes/auth.google');
const sessionRouter = require('./routes/session');

const authRouter = require('./routes/auth');
const productsRouter = require('./routes/products');
const cartRouter = require('./routes/cart');
const ordersRouter = require('./routes/orders');
const usersRouter = require('./routes/users');
const categoriesRouter = require('./routes/categories');
const paymentsRouter = require('./routes/payments');
const sanitizeHtml = require('sanitize-html');
const setupSwagger = require('./swagger');

// Import local strategy setup
const setupPassportLocal = require('./config/passportLocal');

const app = express();
const PORT = process.env.PORT || 3000;

// Detect environment for secure cookies
const IS_PROD = process.env.NODE_ENV === 'production';

// In production behind a proxy (Render/Heroku/Nginx), trust the first proxy
if (IS_PROD) {
  app.set('trust proxy', 1);
}

// --- Security & parsers ---
// Allow embedding static assets (images) cross-origin (e.g., API on :3000, front on :5173)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Build a whitelist from ENV (supports multiple comma-separated origins)
const ORIGINS = (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(
  cors({
    // Allow credentials (cookies) and restrict to known origins
    origin(origin, cb) {
      // Allow same-origin or tools without Origin header (curl/health checks)
      if (!origin) return cb(null, true);
      cb(null, ORIGINS.includes(origin));
    },
    credentials: true,
    // Be explicit for preflight requests
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(compression()); // enable gzip compression for all responses

// --- Health check for platform probes ---
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// --- Sanitize incoming data early (before routes) ---
// Skip sanitizing for specific keys where raw strings must be preserved.
const SANITIZE_SKIP_KEYS = new Set(['image_url']);

app.use((req, res, next) => {
  const scrub = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const k of Object.keys(obj)) {
      const val = obj[k];
      if (typeof val === 'string') {
        obj[k] = SANITIZE_SKIP_KEYS.has(k)
          ? val
          : sanitizeHtml(val, { allowedTags: [], allowedAttributes: {} });
      } else if (val && typeof val === 'object') {
        scrub(val);
      }
    }
  };
  scrub(req.body);
  scrub(req.params);
  scrub(req.query);
  next();
});

// --- Serve static assets (optional, used for site-relative image URLs) ---
const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, 'public');
app.use(
  '/static',
  express.static(STATIC_DIR, {
    maxAge: IS_PROD ? '1d' : 0,
    etag: true,
    immutable: IS_PROD,
  })
);

// --- Enable sessions (required for Passport sessions) ---
// Use a durable session store in production to avoid MemoryStore.
let sessionStore = undefined;
if (IS_PROD) {
  const pgSession = require('connect-pg-simple')(session);
  const pool = require('./db');
  sessionStore = new pgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true, // auto-create the table if not exists
  });
}

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev_session_secret',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: sessionStore, // undefined in dev -> MemoryStore; pg store in prod
    cookie: {
      httpOnly: true,
      secure: IS_PROD,                 // secure cookies on HTTPS (Render)
      sameSite: IS_PROD ? 'none' : 'lax',
      maxAge: Number(process.env.SESSION_TTL_MS || 7 * 24 * 60 * 60 * 1000),
    },
  })
);

// --- Passport setup ---
setupPassportLocal(passport);

// Define serializers BEFORE passport.session() to be explicit
passport.serializeUser((user, done) => {
  const slim =
    user && typeof user === 'object'
      ? {
          id: user.id || user.sub || user.user_id,
          username: user.username,
          email: user.email,
          role: user.role,
        }
      : user;
  done(null, slim);
});
passport.deserializeUser((obj, done) => done(null, obj));

app.use(passport.initialize());
app.use(passport.session());

// --- Auth/session routes ---
app.use('/auth', sessionRouter);
app.use('/auth', googleAuthRouter);

// --- Swagger ---
// Allow disabling Swagger in production via env flag, default is enabled
const SWAGGER_ENABLED = process.env.SWAGGER_ENABLED !== 'false';
if (SWAGGER_ENABLED) {
  setupSwagger(app);
}

// --- API routes ---
app.use('/products', productsRouter);
app.use('/', authRouter);
app.use('/cart', cartRouter);
app.use('/orders', ordersRouter);
app.use('/users', usersRouter);
app.use('/categories', categoriesRouter);
app.use('/payments', paymentsRouter);

// --- 404 ---
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// --- Error handler ---
app.use((err, req, res, next) => {
  if (req.originalUrl.startsWith('/docs')) return next(err);
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON in request body' });
  }
  console.error(err.stack || err);
  return res.status(err.status || 500).json({ error: 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
