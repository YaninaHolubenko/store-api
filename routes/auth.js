// routes/auth.js
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const LocalStrategy = require('passport-local').Strategy;
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

require('dotenv').config();

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

const router = express.Router();

// Configure passport local strategy
passport.use(new LocalStrategy(
  { usernameField: 'username', passwordField: 'password' },
  async (username, password, done) => {
    try {
      const result = await pool.query(
        'SELECT id, username, password_hash FROM users WHERE username = $1 OR email = $1',
        [username]
      );
      if (result.rows.length === 0) {
        return done(null, false, { message: 'Invalid credentials' });
      }
      const user = result.rows[0];
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return done(null, false, { message: 'Invalid credentials' });
      }
      return done(null, { id: user.id, username: user.username });
    } catch (err) {
      return done(err);
    }
  }
));

// Serialization (not used since session = false)
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT id, username FROM users WHERE id = $1', [id]);
    done(null, result.rows[0] || false);
  } catch (err) {
    done(err);
  }
});

// Initialize passport
router.use(passport.initialize());

// POST /register - user registration
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    // Check existing
    const exists = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email taken' });
    }
    // Hash password
    const hash = await bcrypt.hash(password, Number(process.env.SALT_ROUNDS));
    const newUser = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hash]
    );
    const user = newUser.rows[0];
    // Generate token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /login - authenticate via passport and issue JWT
router.post('/login',
  passport.authenticate('local', { session: false }),
  (req, res) => {
    const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  }
);

module.exports = router;
