// controllers/orderController.js
const Order = require('../models/order');
const User = require('../models/user'); // to load role when needed

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
 * Update order status (admin only; route already uses checkAdmin)
 */
async function updateStatus(req, res) {
  try {
    const orderId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ error: 'Invalid order id' });
    }
    if (!status) {
      return res.status(400).json({ error: 'Missing status field' });
    }

    // Extra safety: ensure admin (checkAdmin should have set req.user.role)
    if (req.user?.role !== 'admin') {
      // Fallback: load from DB if not set
      const dbUser = await User.findByIdWithRole(req.user.id);
      if (!dbUser || dbUser.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const updated = await Order.updateStatusAdmin(orderId, status);
    if (!updated) {
      return res.status(404).json({ error: 'Order not found' });
    }
    return res.json({ order: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}


/**
 * Delete or cancel an order:
 * - Admin: hard delete any order (order + items)
 * - User: cancel own 'pending' order (set status = 'cancelled')
 */
async function deleteOrder(req, res) {
  try {
    const userId = req.user.id;
    const orderId = parseInt(req.params.id, 10);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ error: 'Invalid order id' });
    }

    // Determine role (authenticateToken doesn't attach role by default)
    let role = req.user.role;
    if (!role) {
      const dbUser = await User.findByIdWithRole(userId);
      role = dbUser?.role;
    }

    const meta = await Order.getMetaById(orderId);
    if (!meta) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (role === 'admin') {
      const ok = await Order.hardDeleteById(orderId);
      if (!ok) return res.status(404).json({ error: 'Order not found' });
      return res.status(204).send();
    }

    // Regular user: must own the order and it must be 'pending'
    if (meta.user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (meta.status !== 'pending') {
      return res.status(403).json({ error: 'Only pending orders can be cancelled' });
    }

    const cancelled = await Order.cancelOwnPending(orderId, userId);
    if (!cancelled) {
      // race condition: status changed meanwhile
      return res.status(409).json({ error: 'Order cannot be cancelled anymore' });
    }

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Admin: list all orders with owner info (optional ?status=)
async function adminListAll(req, res) {
  try {
    const { status } = req.query;
    const orders = await Order.adminFindAll(status);
    return res.json({ orders });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Admin: get any order with items and owner info
async function adminGetOne(req, res) {
  try {
    const orderId = parseInt(req.params.id, 10);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ error: 'Invalid order id' });
    }

    const data = await Order.adminFindById(orderId);
    if (!data) {
      return res.status(404).json({ error: 'Order not found' });
    }
    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  listOrders,
  getOrder,
  updateStatus,
  deleteOrder,
  adminListAll,
  adminGetOne,
};