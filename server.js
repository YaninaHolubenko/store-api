// server.js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');           
const passport = require('passport');

const googleAuthRouter = require('./routes/auth.google');
const sessionRouter = require('./routes/session');

const authRouter = require('./routes/auth');
const productsRouter = require('./routes/products');
const cartRouter = require('./routes/cart');
const ordersRouter = require('./routes/orders');
const usersRouter = require('./routes/users');
const categoriesRouter = require('./routes/categories');
const sanitizeHtml = require('sanitize-html');
const setupSwagger = require('./swagger');

// Import local strategy setup
const setupPassportLocal = require('./config/passportLocal');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Security & parsers ---
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true, // allow cookies for cross-origin requests
}));
app.use(express.json({ limit: '10kb' }));

// --- Enable sessions (required for Passport sessions) ---
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_session_secret',
  resave: false,
  saveUninitialized: false,
  // cookie: { secure: true } // enable on HTTPS + trust proxy
}));

// --- Passport setup ---
setupPassportLocal(passport);   // register local strategy
app.use(passport.initialize());
app.use(passport.session());

// Minimal serialization: keep slim user object in session
passport.serializeUser((user, done) => {
  const slim = user && typeof user === 'object'
    ? { id: user.id || user.sub || user.user_id, username: user.username, email: user.email, role: user.role }
    : user;
  done(null, slim);
});
passport.deserializeUser((obj, done) => done(null, obj));

// --- Auth/session routes ---
app.use('/auth', sessionRouter);      // /auth/session, /auth/logout
app.use('/auth', googleAuthRouter);   // /auth/google, /auth/google/callback

// --- Swagger ---
setupSwagger(app);

// --- API routes ---
app.use('/products', productsRouter);
app.use('/', authRouter);
app.use('/cart', cartRouter);
app.use('/orders', ordersRouter);
app.use('/users', usersRouter);
app.use('/categories', categoriesRouter);

// --- Sanitizer ---
app.use((req, res, next) => {
  const scrub = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const k of Object.keys(obj)) {
      const val = obj[k];
      if (typeof val === 'string') {
        obj[k] = sanitizeHtml(val, { allowedTags: [], allowedAttributes: {} });
      } else if (val && typeof val === 'object') {
        scrub(val);
      }
    }
  };
  scrub(req.body);
  scrub(req.params);
  next();
});

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
