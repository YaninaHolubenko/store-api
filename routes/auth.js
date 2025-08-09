const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { validationResult } = require('express-validator');
const { registerRules, loginRules } = require('../validators/auth');
const authController = require('../controllers/authController');

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
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *             required:
 *               - username
 *               - email
 *               - password
 *     responses:
 *       '201':
 *         description: User registered successfully
 *       '400':
 *         description: Validation error or username/email taken
 *       '429':
 *         description: Too many registration attempts
 *       '500':
 *         description: Server error
 */
router.post(
  '/register',
  registerLimiter,
  registerRules,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  authController.register
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
 *               password:
 *                 type: string
 *                 format: password
 *             required:
 *               - username
 *               - password
 *     responses:
 *       '200':
 *         description: Token issued successfully
 *       '400':
 *         description: Validation error
 *       '401':
 *         description: Missing credentials
 *       '403':
 *         description: Invalid credentials
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  authController.login
);

module.exports = router;
