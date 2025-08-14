// controllers/userController.js
const bcrypt = require('bcrypt');
const User = require('../models/user');

/**
 * Get current user's profile
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function getProfile(req, res) {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Get a specific user's profile by ID (self only)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function getById(req, res) {
  try {
    const targetId = parseInt(req.params.id, 10);
    // Only allow user to fetch own profile
    if (req.user.id !== targetId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const user = await User.findById(targetId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Update current user's profile
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const { username, email, password } = req.body;
    let passwordHash;
    if (password) {
      passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT_ROUNDS));
    }
    const updated = await User.updateById(userId, { username, email, passwordHash });
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: updated });
  } catch (err) {
    console.error(err);
    // Handle unique constraint violation (username/email already taken)
    if (err && err.code === '23505') {
      return res.status(409).json({ error: 'Username or email already in use' });
    }
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Delete a specific user's account by ID (self only)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function deleteById(req, res) {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (req.user.id !== targetId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await User.deleteById(targetId);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  getProfile,
  getById,
  updateProfile,
  deleteById
};
