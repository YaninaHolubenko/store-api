// models/order.js
const pool = require('../db/index');

async function findAllByUser(userId) {
  // Return basic order info + lightweight preview fields for the first item
  const res = await pool.query(
    `SELECT
       o.id,
       o.total_amount,
       o.status,
       o.created_at,
       /* preview fields for faster list rendering */
       (
         SELECT p.image_url
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = o.id
         ORDER BY oi.id ASC
         LIMIT 1
       ) AS preview_image_url,
       (
         SELECT p.name
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = o.id
         ORDER BY oi.id ASC
         LIMIT 1
       ) AS preview_title
     FROM orders o
     WHERE o.user_id = $1
     ORDER BY o.created_at DESC`,
    [userId]
  );
  return res.rows;
}

async function findById(orderId, userId) {
  const orderRes = await pool.query(
    'SELECT id, total_amount, status, created_at FROM orders WHERE id=$1 AND user_id=$2',
    [orderId, userId]
  );
  const order = orderRes.rows[0];
  if (!order) return null;

  // Include product image_url for each order item
  const itemsRes = await pool.query(
    `SELECT
       oi.id          AS order_item_id,
       p.id           AS product_id,
       p.name,
       p.description,
       p.image_url,          -- include image for client thumbnails
       oi.quantity,
       oi.price
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = $1
     ORDER BY oi.id ASC`,
    [orderId]
  );
  return { order, items: itemsRes.rows };
}

// --- admin/user helpers for permissions ---

async function getMetaById(orderId) {
  const res = await pool.query(
    'SELECT id, user_id, status FROM orders WHERE id = $1',
    [orderId]
  );
  return res.rows[0] || null;
}

async function updateStatusAdmin(orderId, status) {
  const res = await pool.query(
    `UPDATE orders
     SET status = $2
     WHERE id = $1
     RETURNING id, total_amount, status, created_at`,
    [orderId, status]
  );
  return res.rows[0] || null;
}

async function hardDeleteById(orderId) {
  await pool.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
  const del = await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
  return del.rowCount > 0;
}

async function cancelOwnPending(orderId, userId) {
  const res = await pool.query(
    `UPDATE orders
     SET status = 'cancelled'
     WHERE id = $1
       AND user_id = $2
       AND status = 'pending'
     RETURNING id, total_amount, status, created_at`,
    [orderId, userId]
  );
  return res.rows[0] || null;
}

// Admin: list all orders with owner info (optional status filter)
async function adminFindAll(status) {
  if (status) {
    const res = await pool.query(
      `SELECT o.id, o.total_amount, o.status, o.created_at,
              u.id AS user_id, u.username, u.email
       FROM orders o
       JOIN users u ON u.id = o.user_id
       WHERE o.status = $1
       ORDER BY o.created_at DESC`,
      [status]
    );
    return res.rows.map(r => ({
      id: r.id,
      total_amount: r.total_amount,
      status: r.status,
      created_at: r.created_at,
      user: { id: r.user_id, username: r.username, email: r.email }
    }));
  } else {
    const res = await pool.query(
      `SELECT o.id, o.total_amount, o.status, o.created_at,
              u.id AS user_id, u.username, u.email
       FROM orders o
       JOIN users u ON u.id = o.user_id
       ORDER BY o.created_at DESC`
    );
    return res.rows.map(r => ({
      id: r.id,
      total_amount: r.total_amount,
      status: r.status,
      created_at: r.created_at,
      user: { id: r.user_id, username: r.username, email: r.email }
    }));
  }
}

// Admin: get any order with items and owner info
async function adminFindById(orderId) {
  const orderRes = await pool.query(
    `SELECT o.id, o.user_id, o.total_amount, o.status, o.created_at,
            u.username, u.email
     FROM orders o
     JOIN users u ON u.id = o.user_id
     WHERE o.id = $1`,
    [orderId]
  );
  const order = orderRes.rows[0];
  if (!order) return null;

  // Include product image_url for each order item
  const itemsRes = await pool.query(
    `SELECT
       oi.id          AS order_item_id,
       p.id           AS product_id,
       p.name,
       p.description,
       p.image_url,          -- include image for admin/order details
       oi.quantity,
       oi.price
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = $1
     ORDER BY oi.id ASC`,
    [orderId]
  );

  return {
    order: {
      id: order.id,
      user_id: order.user_id,
      total_amount: order.total_amount,
      status: order.status,
      created_at: order.created_at
    },
    items: itemsRes.rows,
    user: {
      id: order.user_id,
      username: order.username,
      email: order.email
    }
  };
}

module.exports = {
  findAllByUser,
  findById,
  updateStatusAdmin,
  hardDeleteById,
  cancelOwnPending,
  getMetaById,
  adminFindAll,
  adminFindById,
};
