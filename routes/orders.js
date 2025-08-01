// routes/orders.js
const express = require('express');
const authenticateToken = require('../middlewares/auth');
const pool = require('../db/index');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /orders - Get all orders for current user
router.get('/', async (req, res) => {
  const userId = req.user.id;

  try {
    const ordersResult = await pool.query(
      'SELECT id, total_amount, status, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({ orders: ordersResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /orders/:id - Get details of a specific order
router.get('/:id', async (req, res) => {
  const userId = req.user.id;
  const orderId = req.params.id;

  try {
    const orderCheck = await pool.query(
      'SELECT id, total_amount, status, created_at FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, userId]
    );
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orderCheck.rows[0];

    const itemsResult = await pool.query(
      `SELECT oi.id AS order_item_id,
              p.id AS product_id,
              p.name,
              p.description,
              oi.quantity,
              oi.price
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    res.json({ order, items: itemsResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /orders/:id - Update order status
router.patch('/:id', async (req, res) => {
  const userId = req.user.id;
  const orderId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Missing status field' });
  }

  try {
    // Verify order ownership
    const check = await pool.query(
      'SELECT id FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, userId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING id, total_amount, status, created_at',
      [status, orderId]
    );

    res.json({ order: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /orders/:id - Cancel or delete an order
router.delete('/:id', async (req, res) => {
  const userId = req.user.id;
  const orderId = req.params.id;

  try {
    // Verify order ownership
    const check = await pool.query(
      'SELECT id FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, userId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Delete order items first to avoid FK constraint errors
    await pool.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
    // Delete the order
    await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;