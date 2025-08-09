// models/order.js
const pool = require('../db/index');

async function findAllByUser(userId) {
  const res = await pool.query(
    'SELECT id, total_amount, status, created_at FROM orders WHERE user_id=$1 ORDER BY created_at DESC',
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
  const itemsRes = await pool.query(
    `SELECT oi.id AS order_item_id, p.id AS product_id, p.name, p.description, oi.quantity, oi.price
     FROM order_items oi
     JOIN products p ON oi.product_id=p.id
     WHERE oi.order_id=$1`,
    [orderId]
  );
  return { order, items: itemsRes.rows };
}

async function updateStatus(orderId, userId, status) {
  const res = await pool.query(
    'UPDATE orders SET status=$1 WHERE id=$2 AND user_id=$3 RETURNING id, total_amount, status, created_at',
    [status, orderId, userId]
  );
  return res.rows[0] || null;
}

async function deleteById(orderId, userId) {
  // delete items first
  await pool.query('DELETE FROM order_items WHERE order_id=$1', [orderId]);
  const res = await pool.query(
    'DELETE FROM orders WHERE id=$1 AND user_id=$2 RETURNING id',
    [orderId, userId]
  );
  return res.rows.length>0;
}

module.exports = {
  findAllByUser,
  findById,
  updateStatus,
  deleteById,
};
