// controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

/**
 * Register a new user
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function register(req, res) {
  try {
    const { username, email, password } = req.body;
    // Validate input fields
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Check if username or email is already taken
    const existingUser = await User.findByUsernameOrEmail(username, email);
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email taken' });
    }
    // Hash the password
    const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT_ROUNDS));
    // Create user in the database
    const newUser = await User.create({ username, email, passwordHash });

    // Sign JWT token
    const token = jwt.sign(
      { id: newUser.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    // Return created user (without password) and token
    res.status(201).json({
      user: { id: newUser.id, username: newUser.username, email: newUser.email },
      token
    });
  } catch (error) {
    console.error(error);
    // Handle race condition: unique violation despite pre-check
    if (error && error.code === '23505') {
      return res.status(409).json({ error: 'Username or email taken' });
    }
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Authenticate user credentials and issue JWT
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function login(req, res) {
  try {
    const { username, password } = req.body;
    // Validate credentials presence
    if (!username || !password) {
      return res.status(401).json({ error: 'Missing credentials' });
    }
    // Retrieve user by username or email
    const user = await User.findByUsernameOrEmail(username, username);
    if (!user) {
      return res.status(403).json({ error: 'Invalid credentials' });
    }
    // Compare provided password with stored hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(403).json({ error: 'Invalid credentials' });
    }
    // Sign JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    // Return token
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  register,
  login
};