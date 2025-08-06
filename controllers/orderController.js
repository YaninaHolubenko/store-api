// controllers/orderController.js
const Order = require('../models/order');

/**
 * Get all orders for current user
 */
async function listOrders(req, res) {
  try {
    const userId = req.user.id;
    const orders = await Order.findAllByUser(userId);
    res.json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Get details for a specific order
 */
async function getOrder(req, res) {
  try {
    const userId = req.user.id;
    const orderId = parseInt(req.params.id, 10);
    const order = await Order.findById(orderId, userId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Update order status
 */
async function updateStatus(req, res) {
  try {
    const userId = req.user.id;
    const orderId = parseInt(req.params.id, 10);
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Missing status field' });
    }
    const updated = await Order.updateStatus(orderId, userId, status);
    if (!updated) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ order: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Delete an order
 */
async function deleteOrder(req, res) {
  try {
    const userId = req.user.id;
    const orderId = parseInt(req.params.id, 10);
    const success = await Order.deleteById(orderId, userId);
    if (!success) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  listOrders,
  getOrder,
  updateStatus,
  deleteOrder,
};