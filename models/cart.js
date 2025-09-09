// models/cart.js
const pool = require('../db/index');

/**
 * Find an existing cart for the user or create a new one.
 */
async function findOrCreateByUser(userId) {
  const res = await pool.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
  if (res.rows.length) return res.rows[0];

  const ins = await pool.query(
    'INSERT INTO carts (user_id) VALUES ($1) RETURNING id',
    [userId]
  );
  return ins.rows[0];
}

/**
 * Return cart items joined with product info for rendering / totals.
 */
async function getItemsWithProductDetails(cartId) {
  const res = await pool.query(
    `
    SELECT
      ci.id        AS cart_item_id,
      p.id         AS product_id,
      p.name,
      p.description,
      p.price,
      p.image_url,
      ci.quantity
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.cart_id = $1
    `,
    [cartId]
  );
  return res.rows;
}

/**
 * Add an item to the cart or increase its quantity.
 * Enforces stock limit at insert/update time.
 * Throws Error with .code = 'INVALID_PRODUCT' | 'PRODUCT_NOT_FOUND' | 'INVALID_QUANTITY' | 'INSUFFICIENT_STOCK'
 */
async function addOrUpdateItem(cartId, productId, quantity) {
  // normalize inputs
  const pid = Number(productId);
  const qty = Number(quantity);

  if (!Number.isInteger(pid) || pid <= 0) {
    const e = new Error('Invalid product id');
    e.code = 'INVALID_PRODUCT';
    throw e;
  }
  if (!Number.isInteger(qty) || qty <= 0) {
    const e = new Error('Invalid quantity');
    e.code = 'INVALID_QUANTITY';
    throw e;
  }

  // Load product (with stock/name for better error details)
  const prod = await pool.query(
    'SELECT id, name, stock FROM products WHERE id = $1',
    [pid]
  );
  if (!prod.rows.length) {
    const e = new Error('Product not found');
    e.code = 'PRODUCT_NOT_FOUND';
    throw e;
  }
  const product = prod.rows[0];
  const stock = Number(product.stock) || 0;

  // Check if this item already exists in the cart
  const existing = await pool.query(
    'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
    [cartId, pid]
  );

  if (existing.rows.length) {
    const currentQty = Number(existing.rows[0].quantity) || 0;
    const newQty = currentQty + qty;

    if (newQty > stock) {
      const e = new Error('Insufficient stock');
      e.code = 'INSUFFICIENT_STOCK';
      e.details = {
        productId: Number(product.id),
        productName: product.name,
        requested: newQty,
        available: stock,
      };
      throw e;
    }

    const up = await pool.query(
      `
      UPDATE cart_items
      SET quantity = $1
      WHERE id = $2
      RETURNING id AS cart_item_id, product_id, quantity
      `,
      [newQty, existing.rows[0].id]
    );
    return up.rows[0];
  }

  // New row path
  if (qty > stock) {
    const e = new Error('Insufficient stock');
    e.code = 'INSUFFICIENT_STOCK';
    e.details = {
      productId: Number(product.id),
      productName: product.name,
      requested: qty,
      available: stock,
    };
    throw e;
  }

  const ins = await pool.query(
    `
    INSERT INTO cart_items (cart_id, product_id, quantity)
    VALUES ($1, $2, $3)
    RETURNING id AS cart_item_id, product_id, quantity
    `,
    [cartId, pid, qty]
  );
  return ins.rows[0];
}

/**
 * Transactional checkout:
 * - Validates stock for all items (again) under FOR UPDATE
 * - Decrements product stock
 * - Creates order and order_items
 * - Clears cart items
 * Returns { orderId, totalAmount, status }
 *
 * Throws Error with .code = 'CART_EMPTY' | 'INSUFFICIENT_STOCK_AT_CHECKOUT'
 */
async function checkoutCart(cartId, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock items and read product stock/price
    const { rows: items } = await client.query(
      `
      SELECT
        ci.product_id,
        ci.quantity,
        p.name,
        p.stock,
        p.price
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.cart_id = $1
      FOR UPDATE
      `,
      [cartId]
    );

    if (!items || items.length === 0) {
      const e = new Error('Cart empty');
      e.code = 'CART_EMPTY';
      throw e;
    }

    // Validate stock before any update
    for (const it of items) {
      const wanted = Number(it.quantity) || 0;
      const available = Number(it.stock) || 0;
      if (wanted > available) {
        const e = new Error('Insufficient stock at checkout');
        e.code = 'INSUFFICIENT_STOCK_AT_CHECKOUT';
        e.details = {
          productId: Number(it.product_id),
          productName: it.name,
          requested: wanted,
          available,
        };
        throw e;
      }
    }

    // Decrement stock
    for (const it of items) {
      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [it.quantity, it.product_id]
      );
    }

    // Compute total
    const total = items.reduce(
      (sum, i) => sum + Number(i.price) * Number(i.quantity),
      0
    );

    // Create order
    const { rows: orderRows } = await client.query(
      `
      INSERT INTO orders (user_id, total_amount)
      VALUES ($1, $2)
      RETURNING id, total_amount, status
      `,
      [userId, total]
    );
    const order = orderRows[0];
    const orderId = order.id;

    // Insert order items
    for (const i of items) {
      await client.query(
        `
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES ($1, $2, $3, $4)
        `,
        [orderId, i.product_id, i.quantity, i.price]
      );
    }

    // Clear cart
    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);

    await client.query('COMMIT');

    return {
      orderId,
      totalAmount: order.total_amount,
      status: order.status,
    };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Change quantity for a cart item owned by the user.
 */
async function updateItemQuantity(cartItemId, userId, quantity) {
  const res = await pool.query(
    `
    UPDATE cart_items ci
    SET quantity = $1
    FROM carts c
    WHERE ci.cart_id = c.id
      AND ci.id = $2
      AND c.user_id = $3
    RETURNING ci.id AS id, ci.product_id, ci.quantity
    `,
    [quantity, cartItemId, userId]
  );
  return res.rows[0] || null;
}

/**
 * Remove a cart item owned by the user.
 */
async function removeItem(cartItemId, userId) {
  const res = await pool.query(
    `
    DELETE FROM cart_items ci
    USING carts c
    WHERE ci.cart_id = c.id
      AND ci.id = $1
      AND c.user_id = $2
    RETURNING ci.id
    `,
    [cartItemId, userId]
  );
  return res.rows.length > 0;
}

/**
 * Check if a given cart belongs to the user.
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
