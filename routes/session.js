// routes/session.js
const router = require('express').Router();

// Simple info endpoint so /auth isn't a 404
router.get('/', (req, res) => {
  res.json({
    ok: true,
    routes: [
      'GET  /auth',             // this page
      'GET  /auth/session',     // check current session
      'POST /auth/logout',      // destroy session
      'GET  /auth/google',      // start Google OAuth
      'GET  /auth/google/callback' // Google callback
    ]
  });
});

// Check current session state
router.get('/session', (req, res) => {
  res.json({
    authenticated: !!req.user,
    user: req.user || null,
  });
});

// Logout and destroy session
router.post('/logout', (req, res, next) => {
  // Passport >=0.6 requires a callback
  req.logout(err => {
    if (err) return next(err);
    req.session.destroy(() => res.json({ ok: true }));
  });
});

module.exports = router;
