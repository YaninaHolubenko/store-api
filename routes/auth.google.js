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

/*
  Create or find a local user by Google profile.
  Stores a random hashed password if schema requires password/password_hash column.
  This keeps the users table consistent without exposing any real password.
*/
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

  // 3) Build username (slugify and ensure uniqueness)
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
    // Store a hashed random "placeholder" password to satisfy schema constraints
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

/**
 * @openapi
 * /auth:
 *   get:
 *     summary: List available auth routes (debug)
 *     tags:
 *       - Auth
 *     security: []   # public
 *     responses:
 *       200:
 *         description: Routes listing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 routes:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get('/', (req, res) => {
  res.json({
    ok: true,
    routes: [
      'GET /auth',
      'GET /auth/session',
      // logout is handled centrally in routes/session.js
      'GET /auth/google',
      'GET /auth/google/callback'
    ],
  });
});

/**
 * @openapi
 * /auth/google:
 *   get:
 *     summary: Start Google OAuth2 flow
 *     description: Redirects the user to Google for authentication (profile, email scopes).
 *     tags:
 *       - Auth
 *     security: []   # public
 *     responses:
 *       302:
 *         description: Redirect to Google consent screen
 */
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: true }));

/**
 * @openapi
 * /auth/google/callback:
 *   get:
 *     summary: Google OAuth2 callback
 *     description: |
 *       Handles the callback from Google. On success:
 *       - If the client expects JSON (XHR), returns `{ ok: true, user }`.
 *       - Otherwise redirects to the client app.
 *     tags:
 *       - Auth
 *     security: []   # public endpoint that sets the session
 *     responses:
 *       302:
 *         description: Redirect to client app on success (non-XHR)
 *       200:
 *         description: JSON response on XHR requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${CLIENT_URL}/login`, session: true }),
  (req, res) => {
    // If the client expects JSON (e.g., XHR), return JSON; otherwise redirect to the app
    if (req.headers.accept?.includes('application/json')) {
      return res.json({ ok: true, user: req.user });
    }
    return res.redirect(CLIENT_URL);
  }
);

/**
 * @openapi
 * /auth/session:
 *   get:
 *     summary: Get current session state
 *     description: Returns whether the user is authenticated via session and the user payload if present.
 *     tags:
 *       - Auth
 *     security: []   # public: returns { authenticated: false } if not logged in
 *     responses:
 *       200:
 *         description: Session state
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authenticated:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 */
router.get('/session', (req, res) => {
  res.json({ authenticated: !!req.user, user: req.user || null });
});

// NOTE: No logout here. Use POST /auth/logout defined in routes/session.js

module.exports = router;
