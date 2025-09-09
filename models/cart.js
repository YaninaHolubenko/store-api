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
  // Validate input quantity
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    const err = new Error('Invalid quantity');
    err.code = 'INVALID_QUANTITY';
    throw err;
  }

  // Check product existence and stock
  const prod = await pool.query('SELECT id, stock FROM products WHERE id = $1', [productId]);
  if (!prod.rows.length) {
    const err = new Error('Product not found');
    err.code = 'PRODUCT_NOT_FOUND';
    throw err;
  }
  const available = Number(prod.rows[0].stock) || 0;

  // Check if item exists
  const existing = await pool.query(
    'SELECT id, quantity FROM cart_items WHERE cart_id=$1 AND product_id=$2',
    [cartId, productId]
  );

  if (existing.rows.length) {
    const currentQty = Number(existing.rows[0].quantity) || 0;
    const newQty = currentQty + qty;

    // Enforce stock at cart level to give early feedback
    if (newQty > available) {
      const err = new Error('Insufficient stock');
      err.code = 'INSUFFICIENT_STOCK';
      err.details = { productId: Number(productId), requested: newQty, available };
      throw err;
    }

    const up = await pool.query(
      'UPDATE cart_items SET quantity=$1 WHERE id=$2 RETURNING id AS cart_item_id, product_id, quantity',
      [newQty, existing.rows[0].id]
    );
    return up.rows[0];
  }

  // New cart item
  if (qty > available) {
    const err = new Error('Insufficient stock');
    err.code = 'INSUFFICIENT_STOCK';
    err.details = { productId: Number(productId), requested: qty, available };
    throw err;
  }

  const ins = await pool.query(
    'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1,$2,$3) RETURNING id AS cart_item_id, product_id, quantity',
    [cartId, productId, qty]
  );
  return ins.rows[0];
}

async function checkoutCart(cartId, userId) {
  const client = await pool.connect();
  try {
    // 1) Start SQL transaction
    await client.query('BEGIN');

    // 2) Lock cart items and products to avoid concurrent changes during checkout
    const { rows: items } = await client.query(
      `
      SELECT ci.product_id, ci.quantity, p.price, p.stock
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.cart_id = $1
      FOR UPDATE OF ci, p
      `,
      [cartId]
    );

    if (!items || items.length === 0) {
      const err = new Error('Cart empty');
      err.code = 'CART_EMPTY';
      throw err;
    }

    // 3) Ensure stock is sufficient for every item (re-check at checkout time)
    for (const i of items) {
      const qty = Number(i.quantity) || 0;
      const stock = Number(i.stock) || 0;
      if (qty > stock) {
        const err = new Error('Insufficient stock at checkout');
        err.code = 'INSUFFICIENT_STOCK_AT_CHECKOUT';
        err.details = {
          productId: Number(i.product_id),
          requested: qty,
          available: stock,
        };
        throw err;
      }
    }

    // 4) Compute total in SQL (numeric for precision)
    const { rows: totalRows } = await client.query(
      `
      SELECT SUM(ci.quantity::numeric * p.price) AS total
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.cart_id = $1
      `,
      [cartId]
    );
    const total = totalRows[0]?.total ?? 0; // numeric from PG (string compatible)

    // 5) Create order
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

    // 6) Insert order items
    for (const i of items) {
      await client.query(
        `
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES ($1, $2, $3, $4)
        `,
        [orderId, i.product_id, i.quantity, i.price]
      );
    }

    // 7) Decrement product stock
    for (const i of items) {
      await client.query(
        `UPDATE products SET stock = stock - $2 WHERE id = $1`,
        [i.product_id, i.quantity]
      );
    }

    // 8) Clear the cart
    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);

    // 9) Commit transaction
    await client.query('COMMIT');

    // 10) Keep the original response shape expected by the controller
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
