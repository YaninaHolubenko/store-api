// routes/auth.google.js
const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('../db'); // keep this path as in your project
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const router = express.Router();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BCRYPT_SALT_ROUNDS } = process.env;

// Create/find local user by Google profile; adapt to schema (password/password_hash/none)
async function ensureLocalUser({ email, displayName }) {
  if (!email) {
    const err = new Error('Google account did not provide an email');
    err.status = 400;
    throw err;
  }

  // 1) Try find by email
  const found = await pool.query('SELECT id, username, email FROM users WHERE email = $1', [email]);
  if (found.rows.length) return found.rows[0];

  // 2) Determine password column if any
  const colsRes = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`
  );
  const cols = colsRes.rows.map(r => r.column_name);
  const passwordCol = cols.includes('password')
    ? 'password'
    : (cols.includes('password_hash') ? 'password_hash' : null);

  // 3) Build username
  const base = (displayName || email.split('@')[0] || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'user';

  let username = base;
  for (let i = 0; i < 50; i += 1) {
    const chk = await pool.query('SELECT 1 FROM users WHERE username = $1', [username]);
    if (chk.rows.length === 0) break;
    username = `${base}-${i + 1}`;
  }

  // 4) Prepare insert
  const fields = ['username', 'email'];
  const values = [username, email];
  const placeholders = ['$1', '$2'];

  if (passwordCol) {
    const raw = `google:${crypto.randomBytes(24).toString('hex')}`;
    const rounds = Number(BCRYPT_SALT_ROUNDS || 10);
    const hash = await bcrypt.hash(raw, rounds);
    fields.push(passwordCol);
    values.push(hash);
    placeholders.push(`$${placeholders.length + 1}`);
  }

  const ins = await pool.query(
    `INSERT INTO users (${fields.join(', ')}) VALUES (${placeholders.join(', ')})
     RETURNING id, username, email`,
    values
  );
  return ins.rows[0];
}

// Strategy: map Google profile -> local user
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || null;
        const displayName = profile.displayName || profile.name?.givenName || 'User';
        const localUser = await ensureLocalUser({ email, displayName });
        return done(null, { id: localUser.id, username: localUser.username, email: localUser.email });
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Debug
router.get('/', (req, res) => {
  res.json({
    ok: true,
    routes: ['GET /auth', 'GET /auth/session', 'POST /auth/logout', 'GET /auth/google', 'GET /auth/google/callback'],
  });
});

// Start OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: true }));

// Callback
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${CLIENT_URL}/login`, session: true }),
  (req, res) => {
    if (req.headers.accept?.includes('application/json')) {
      return res.json({ ok: true, user: req.user });
    }
    return res.redirect(CLIENT_URL);
  }
);

// Session state
router.get('/session', (req, res) => {
  res.json({ authenticated: !!req.user, user: req.user || null });
});

// Logout
router.post('/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ ok: true });
    });
  });
});

module.exports = router;
