// models/cart.js
const pool = require('../db/index');

async function findOrCreateByUser(userId) {
  const res = await pool.query(
    'SELECT id FROM carts WHERE user_id = $1',
    [userId]
  );
  if (res.rows.length) return res.rows[0];
  const ins = await pool.query(
    'INSERT INTO carts (user_id) VALUES ($1) RETURNING id',
    [userId]
  );
  return ins.rows[0];
}

async function getItemsWithProductDetails(cartId) {
  const res = await pool.query(
    `SELECT ci.id AS cart_item_id, p.id AS product_id, p.name, p.description, p.price, p.image_url, ci.quantity
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     WHERE ci.cart_id = $1`,
    [cartId]
  );
  return res.rows;
}

async function addOrUpdateItem(cartId, productId, quantity) {
  // check product existence
  const prod = await pool.query('SELECT id FROM products WHERE id = $1', [productId]);
  if (!prod.rows.length) throw new Error('Product not found');

  const existing = await pool.query(
    'SELECT id, quantity FROM cart_items WHERE cart_id=$1 AND product_id=$2',
    [cartId, productId]
  );
  if (existing.rows.length) {
    const newQty = existing.rows[0].quantity + quantity;
    const up = await pool.query(
      'UPDATE cart_items SET quantity=$1 WHERE id=$2 RETURNING id AS cart_item_id, product_id, quantity',
      [newQty, existing.rows[0].id]
    );
    return up.rows[0];
  }
  const ins = await pool.query(
    'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1,$2,$3) RETURNING id AS cart_item_id, product_id, quantity',
    [cartId, productId, quantity]
  );
  return ins.rows[0];
}

async function checkoutCart(cartId, userId) {
  const items = await getItemsWithProductDetails(cartId);
  if (items.length === 0) throw new Error('Cart empty');

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const orderRes = await pool.query(
    'INSERT INTO orders (user_id, total_amount) VALUES ($1,$2) RETURNING id AS orderId, total_amount, status',
    [userId, total]
  );
  const order = orderRes.rows[0];

  await Promise.all(items.map(i =>
    pool.query(
      'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1,$2,$3,$4)',
      [order.orderid, i.product_id, i.quantity, i.price]
    )
  ));

  await pool.query('DELETE FROM cart_items WHERE cart_id=$1', [cartId]);
  return { orderId: order.orderid, totalAmount: order.total_amount, status: order.status };
}

async function updateItemQuantity(cartItemId, userId, quantity) {
  const res = await pool.query(
    `UPDATE cart_items ci
     SET quantity=$1
     FROM carts c
     WHERE ci.cart_id=c.id AND ci.id=$2 AND c.user_id=$3
     RETURNING ci.id AS id, ci.product_id, ci.quantity`,
    [quantity, cartItemId, userId]
  );
  return res.rows[0] || null;
}

async function removeItem(cartItemId, userId) {
  const res = await pool.query(
    `DELETE FROM cart_items ci
     USING carts c
     WHERE ci.cart_id=c.id AND ci.id=$1 AND c.user_id=$2
     RETURNING ci.id`,
    [cartItemId, userId]
  );
  return res.rows.length > 0;
}

/**
 * Check if a given cartId belongs to the given userId
 * @returns {Promise<boolean>}
 */
async function userOwnsCart(cartId, userId) {
  const result = await pool.query(
    'SELECT 1 FROM carts WHERE id = $1 AND user_id = $2',
    [cartId, userId]
  );
  return result.rows.length > 0;
}

module.exports = {
  findOrCreateByUser,
  getItemsWithProductDetails,
  addOrUpdateItem,
  checkoutCart,
  updateItemQuantity,
  removeItem,
  userOwnsCart,
};