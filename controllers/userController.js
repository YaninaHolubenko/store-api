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

    // Derive a boolean without exposing any hash
    const hasPassword =
      Boolean(
        user.hasPassword ??
        user.passwordHash ??
        user.password_hash ??
        user.password
      );

    // Never return password/passwordHash fields to client
    const { password, password_hash, passwordHash, ...safe } = user;

    res.json({ user: { ...safe, hasPassword } });
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

    const hasPassword =
      Boolean(
        user.hasPassword ??
        user.passwordHash ??
        user.password_hash ??
        user.password
      );
    const { password, password_hash, passwordHash, ...safe } = user;

    res.json({ user: { ...safe, hasPassword } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Update current user's profile
 * Supports:
 *  - username/email update
 *  - password change (currentPassword + newPassword + newPasswordConfirm)
 *  - password set for OAuth-only users (no currentPassword required)
 * Backward compatibility: accepts `password` as "new password" if newPassword not provided
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function updateProfile(req, res) {
  try {
    const userId = req.user.id;

    // Accept both new API fields and legacy "password"
    const {
      username,
      email,
      currentPassword,
      newPassword: bodyNewPassword,
      newPasswordConfirm,
      password: legacyPassword,
    } = req.body;

    // Decide which "new password" to use
    const newPassword = bodyNewPassword || legacyPassword || '';

    // Load current user (should include hash if model exposes it)
    const me = await User.findById(userId);
    if (!me) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Detect current hash field (support multiple schema variants)
    const existingHash =
      me.passwordHash ?? me.password_hash ?? me.password ?? null;

    // If new password flow is requested
    if (newPassword) {
      // If user already has a password -> require and verify current password
      if (existingHash) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Current password is required' });
        }
        const ok = await bcrypt.compare(currentPassword, String(existingHash));
        if (!ok) {
          return res.status(400).json({ error: 'Current password is incorrect' });
        }
      }
      // Confirm newPassword === newPasswordConfirm (extra guard)
      if (newPasswordConfirm !== undefined && newPassword !== newPasswordConfirm) {
        return res.status(400).json({ error: 'Passwords do not match' });
      }
    }

    // Prepare update payload
    const update = {};
    if (typeof username === 'string' && username.length) update.username = username;
    if (typeof email === 'string' && email.length) update.email = email;

    // Hash and set new password if requested
    if (newPassword) {
      const rounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
      update.passwordHash = await bcrypt.hash(newPassword, rounds);
    }

    // Persist
    const updated = await User.updateById(userId, update);
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build safe response (exclude hash fields)
    const { password, password_hash, passwordHash, ...safe } = updated;
    res.json({
      user: safe,
      // Optionally inform client to re-auth after password change
      requireReauth: Boolean(newPassword),
    });
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

/**
 * GET /users (admin only): list all users with optional search + pagination
 */
async function adminList(req, res) {
  try {
    const search = req.query.search || null;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;

    const [users, total] = await Promise.all([
      User.list({ search, limit, offset }),
      User.count({ search }),
    ]);

    res.json({ users, total, limit, offset });
  } catch (err) {
    console.error('Error in adminList:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
}

module.exports = {
  getProfile,
  getById,
  updateProfile,
  deleteById,
  adminList,
};
