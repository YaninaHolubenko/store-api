// routes/session.js
const router = require('express').Router();
const User = require('../models/user'); // load user model to enrich role when needed

// Simple info endpoint so /auth isn't a 404
router.get('/', (req, res) => {
  res.json({
    ok: true,
    routes: [
      'GET  /auth',                 // this page
      'GET  /auth/session',         // check current session
      'POST /auth/logout',          // destroy session
      'GET  /auth/google',          // start Google OAuth
      'GET  /auth/google/callback', // Google callback
    ],
  });
});

// Check current session state (always include role if available)
router.get('/session', async (req, res) => {
  try {
    // Check Passport session state
    const isAuthed =
      typeof req.isAuthenticated === 'function'
        ? req.isAuthenticated()
        : !!req.user;

    if (!isAuthed || !req.user) {
      return res.json({ authenticated: false, user: null });
    }

    // Try to enrich user with role from DB if role is missing
    let dbUser = null;
    try {
      if (User && typeof User.findByIdWithRole === 'function') {
        dbUser = await User.findByIdWithRole(req.user.id);
      } else if (User && typeof User.findById === 'function') {
        dbUser = await User.findById(req.user.id);
      }
    } catch (_) {
      // ignore DB errors here; fall back to req.user
    }

    const u = dbUser || req.user;

    // Build safe shape for the client (never expose password fields)
    const safeUser = {
      id: u.id,
      username: u.username,
      email: u.email,
      // prefer explicit role; fallback to boolean is_admin mapping; default to "user"
      role: u.role || (u.is_admin ? 'admin' : 'user'),
    };

    return res.json({ authenticated: true, user: safeUser });
  } catch (e) {
    console.error('[session] /auth/session error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Logout and destroy the current session
 *     description: |
 *       Logs out the user from the active Passport session and destroys the server-side session.
 *       If no session exists, returns `{ ok: true }` as well (idempotent).
 *     tags:
 *       - Auth
 *     security: []  # public; will simply return ok even if not logged in
 *     responses:
 *       200:
 *         description: Session destroyed (or no-op if not logged in)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// Logout and destroy session
router.post('/logout', (req, res, next) => {
  // Passport >=0.6 requires a callback
  req.logout(err => {
    if (err) return next(err);
    req.session.destroy(() => res.json({ ok: true }));
  });
});

module.exports = router;
