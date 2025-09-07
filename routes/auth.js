// routes/auth.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { validationResult } = require('express-validator');
const { registerRules, loginRules } = require('../validators/auth');
const authController = require('../controllers/authController');
const passport = require('passport');
const jwt = require('jsonwebtoken'); // keep temporarily for compatibility
const User = require('../models/user'); // <-- used to enrich session with role

// Rate limiter for auth endpoints:
// - max 20 registrations per hour per IP
// - max 5 login attempts per minute per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: 'Too many registration attempts from this IP, please try again later' }
});
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Too many login attempts from this IP, please try again later' }
});

/**
 * @openapi
 * /register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: StrongPass123!
 *             required:
 *               - username
 *               - email
 *               - password
 *     responses:
 *       '201':
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *       '400':
 *         description: Validation error or username/email taken
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                         example: Email is invalid
 *                       param:
 *                         type: string
 *                         example: email
 *                       location:
 *                         type: string
 *                         example: body
 *       '429':
 *         description: Too many registration attempts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Too many registration attempts from this IP, please try again later
 *       '500':
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
// Register route (kept as controller; we will add auto-login later as a separate tiny step)
router.post(
  '/register',
  registerLimiter,
  registerRules,
  async (req, res, next) => {
    // Validate first
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      await authController.register(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @openapi
 * /login:
 *   post:
 *     summary: Authenticate user and return JWT token
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *               password:
 *                 type: string
 *                 format: password
 *                 example: StrongPass123!
 *             required:
 *               - username
 *               - password
 *     responses:
 *       '200':
 *         description: Token issued successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   type: object
 *                   properties:
 *                     id: { type: integer, example: 1 }
 *                     username: { type: string, example: johndoe }
 *                     email: { type: string, format: email, example: johndoe@example.com }
 *                     role: { type: string, example: admin }
 *       '400':
 *         description: Validation error
 *       '401':
 *         description: Missing or invalid credentials
 *       '429':
 *         description: Too many login attempts
 *       '500':
 *         description: Server error
 */
router.post(
  '/login',
  loginLimiter,
  loginRules,
  (req, res, next) => {
    // Validate request before authenticating
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  // Replace controller login with Passport Local to create a session
  (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ error: info?.message || 'Invalid credentials' });
      }

      // Establish server-side session
      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);

        // Transitional JWT for backward compatibility
        let token = null;
        if (process.env.JWT_SECRET) {
          token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
          );
        }

        // Return safe user payload with role (role may be 'admin' or 'user')
        const safeUser = {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role || (user.is_admin ? 'admin' : 'user'),
        };

        return res.json({ user: safeUser, token });
      });
    })(req, res, next);
  }
);

/**
 * @openapi
 * /auth/session:
 *   get:
 *     summary: Get current authenticated session (with role)
 *     tags:
 *       - Auth
 *     responses:
 *       '200':
 *         description: Session state
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authenticated:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id: { type: integer, example: 1 }
 *                     username: { type: string, example: admin }
 *                     email: { type: string, format: email, example: admin@example.com }
 *                     role: { type: string, example: admin }
 *       '500':
 *         description: Server error
 */
router.get('/session', async (req, res) => {
  try {
    const isAuthed =
      typeof req.isAuthenticated === 'function'
        ? req.isAuthenticated()
        : !!req.user;

    if (!isAuthed || !req.user) {
      return res.json({ authenticated: false, user: null });
    }

    // Try to enrich session user with role from DB (fallbacks to req.user)
    let dbUser = null;
    try {
      if (User && typeof User.findByIdWithRole === 'function') {
        dbUser = await User.findByIdWithRole(req.user.id);
      } else if (User && typeof User.findById === 'function') {
        dbUser = await User.findById(req.user.id);
      }
    } catch (_) {
      // ignore and fallback to req.user
    }

    const u = dbUser || req.user;
    const safe = {
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role || (u.is_admin ? 'admin' : 'user'),
    };

    return res.json({ authenticated: true, user: safe });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
