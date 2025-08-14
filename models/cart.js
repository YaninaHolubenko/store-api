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
  const client = await pool.connect();
  try {
    // 1) Start SQL transaction
    await client.query('BEGIN');

    // 2) Lock cart rows to prevent concurrent modifications during checkout
    //    We read the minimal fields needed to compute totals and create order items
    const { rows: items } = await client.query(
      `
      SELECT ci.product_id, ci.quantity, p.price
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.cart_id = $1
      FOR UPDATE
      `,
      [cartId]
    );

    if (!items || items.length === 0) {
      // Nothing to checkout; let the controller map this to 400
      throw new Error('Cart empty');
    }

    // 3) Compute total amount
    const total = items.reduce(
      (sum, i) => sum + Number(i.price) * Number(i.quantity),
      0
    );

    // 4) Create order and capture the generated id
    //    Note: some pg configs lowercase field names; we keep a fallback
    const { rows: orderRows } = await client.query(
      `
      INSERT INTO orders (user_id, total_amount)
      VALUES ($1, $2)
      RETURNING id AS orderId, total_amount, status
      `,
      [userId, total]
    );
    const order = orderRows[0];
    const orderId = order.orderId ?? order.orderid ?? order.id;

    // 5) Insert order items (same transaction)
    for (const i of items) {
      await client.query(
        `
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES ($1, $2, $3, $4)
        `,
        [orderId, i.product_id, i.quantity, i.price]
      );
    }

    // 6) Clear the cart (so it cannot be checked out twice)
    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);

    // 7) Commit transaction
    await client.query('COMMIT');

    // 8) Keep the original response shape expected by the controller
    return {
      orderId: orderId,
      totalAmount: order.total_amount,
      status: order.status,
    };
  } catch (err) {
    // Rollback on any error to avoid partial orders
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
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