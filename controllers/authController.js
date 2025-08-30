// controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

/**
 * Register a new user and auto-login via Passport session.
 * Returns a session cookie (server-side) and also a JWT (transitional).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} [next]
 */
async function register(req, res, next) {
  try {
    const { username, email, password } = req.body;

    // Basic presence validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Ensure username/email are unique
    const existingUser = await User.findByUsernameOrEmail(username, email);
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email taken' });
    }

    // Hash password (salt rounds from env)
    const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT_ROUNDS));

    // Persist new user
    const newUser = await User.create({ username, email, passwordHash });

    // Build safe user payload for responses/sessions
    const safeUser = { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role };

    // Issue JWT (transitional, while client migrates to session-only)
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // If Passport is mounted, create a server-side session immediately
    if (typeof req.login === 'function') {
      req.login(safeUser, (err) => {
        if (err) {
          // Defer to global error handler, but still avoid leaking internals
          if (next) return next(err);
          return res.status(500).json({ error: 'Server error' });
        }
        // Successful auto-login: return user + token
        return res.status(201).json({ user: safeUser, token });
      });
      return; // prevent double-send
    }

    // Fallback (if passport not mounted): return user + token without session
    return res.status(201).json({ user: safeUser, token });
  } catch (error) {
    console.error(error);
    // Unique constraint race condition safeguard
    if (error && error.code === '23505') {
      return res.status(409).json({ error: 'Username or email taken' });
    }
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Legacy JWT login (kept for backward compatibility).
 * Note: The /auth/login route now uses Passport Local to create a session.
 * This handler remains for any places still calling it directly.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function login(req, res) {
  try {
    const { username, password } = req.body;

    // Validate presence
    if (!username || !password) {
      return res.status(401).json({ error: 'Missing credentials' });
    }

    // Retrieve by username OR email (identifier used twice intentionally)
    const user = await User.findByUsernameOrEmail(username, username);
    if (!user) {
      return res.status(403).json({ error: 'Invalid credentials' });
    }

    // Select the correct hash column (supporting common names)
    const hash = user.password_hash || user.password_digest || user.password;
    if (!hash) {
      return res.status(403).json({ error: 'Invalid credentials' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, hash);
    if (!isMatch) {
      return res.status(403).json({ error: 'Invalid credentials' });
    }

    // Issue JWT (legacy)
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({ token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  register,
  login
};
