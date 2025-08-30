//routes/auth.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { validationResult } = require('express-validator');
const { registerRules, loginRules } = require('../validators/auth');
const authController = require('../controllers/authController');
const passport = require('passport');
const jwt = require('jsonwebtoken'); // keep temporarily for compatibility

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
 *       '400':
 *         description: Validation error
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
 *                         example: Username is required
 *                       param:
 *                         type: string
 *                         example: username
 *                       location:
 *                         type: string
 *                         example: body
 *       '401':
 *         description: Missing credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Missing credentials
 *       '403':
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid username or password
 *       '429':
 *         description: Too many login attempts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Too many login attempts from this IP, please try again later
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

        // Optional: keep JWT in response for backward compatibility during migration
        let token = null;
        if (process.env.JWT_SECRET) {
          token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
          );
        }

        // Client should rely on the session cookie; token is transitional
        return res.json({ user, token });
      });
    })(req, res, next);
  }
);

module.exports = router;
