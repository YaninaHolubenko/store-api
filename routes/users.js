const express = require('express');
const authenticateToken = require('../middlewares/auth');
const pool = require('../db/index');
const bcrypt = require('bcrypt');

const router = express.Router();
// Protect all user routes
router.use(authenticateToken);

// GET /users - get current user's profile
router.get('/', async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      'SELECT id, username, email FROM users WHERE id = $1',
      [userId]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /users/:id - get specific user profile
router.get('/:id', async (req, res) => {
  const userId = req.user.id;
  const targetId = parseInt(req.params.id, 10);
  if (userId !== targetId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const result = await pool.query(
      'SELECT id, username, email FROM users WHERE id = $1',
      [targetId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /users/:id - update user info
router.put('/:id', async (req, res) => {
  const userId = req.user.id;
  const targetId = parseInt(req.params.id, 10);
  if (userId !== targetId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { username, email, password } = req.body;
  try {
    // Check if user exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [targetId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Hash new password if provided
    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, Number(process.env.SALT_ROUNDS));
    }
    // Update fields
    const result = await pool.query(
      `UPDATE users SET
         username = COALESCE($1, username),
         email = COALESCE($2, email),
         password_hash = COALESCE($3, password_hash)
       WHERE id = $4
       RETURNING id, username, email`,
      [username, email, passwordHash, targetId]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
// DELETE /users/:id - delete user account and all related data
router.delete('/:id', async (req, res) => {
  const userId = req.user.id;
  const targetId = parseInt(req.params.id, 10);
  if (userId !== targetId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    // Delete related order items
    await pool.query(
      `DELETE FROM order_items WHERE order_id IN (
         SELECT id FROM orders WHERE user_id = $1
       )`,
      [targetId]
    );
    // Delete related orders
    await pool.query('DELETE FROM orders WHERE user_id = $1', [targetId]);
    // Delete related cart items
    await pool.query(
      `DELETE FROM cart_items WHERE cart_id IN (
         SELECT id FROM carts WHERE user_id = $1
       )`,
      [targetId]
    );
    // Delete related carts
    await pool.query('DELETE FROM carts WHERE user_id = $1', [targetId]);
    // Finally delete user
    await pool.query('DELETE FROM users WHERE id = $1', [targetId]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
