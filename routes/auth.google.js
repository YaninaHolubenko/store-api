const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');

const router = express.Router();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
    },
    (accessToken, refreshToken, profile, done) => done(null, profile)
  )
);

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google`,
  }),
  (req, res) => {
    const p = req.user || {};
    const email = p.emails?.[0]?.value || '';
    const name = p.displayName || (email ? email.split('@')[0] : 'user');

    const payload = {
      sub: `google:${p.id}`,
      provider: 'google',
      email,
      name,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    const redirect = new URL('/oauth/callback', process.env.CLIENT_URL);
    redirect.searchParams.set('token', token);
    redirect.searchParams.set('email', email);
    redirect.searchParams.set('name', name);

    res.redirect(redirect.toString());
  }
);

module.exports = router;
