// controllers/cartController.js
const Cart = require('../models/cart');
const pool = require('../db/index');

/**
 * Resolve integer local user id for both JWT and Google session.
 * - If req.user.id is already an integer -> use it.
 * - Else try to find by req.user.email in users table.
 * - If not found -> 401 with clear message.
 */
async function resolveLocalUserId(req) {
  const raw = req.user?.id;

  // local JWT login usually sets numeric id
  if (Number.isInteger(raw)) return raw;

  // some JWTs may pass string numbers
  if (typeof raw === 'string' && /^\d+$/.test(raw)) {
    const n = Number(raw);
    if (Number.isSafeInteger(n)) return n;
  }

  const email = req.user?.email;
  if (!email) {
    const e = new Error('No email in session');
    e.status = 401;
    throw e;
  }

  const r = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (!r.rows.length) {
    const e = new Error('Account for this Google email is not linked. Please register once with the same email.');
    e.status = 401;
    throw e;
  }
  return r.rows[0].id;
}

/**
 * Retrieve or create current user's cart
 */
async function getCart(req, res) {
  try {
    const userId = await resolveLocalUserId(req);
    const cart = await Cart.findOrCreateByUser(userId);
    const items = await Cart.getItemsWithProductDetails(cart.id);
    res.json({ cartId: cart.id, items });
  } catch (err) {
    console.error(err);
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Server error' });
  }
}

/**
 * Add product to cart or update quantity (route: POST /cart/items)
 */
async function addItem(req, res) {
  try {
    const userId = await resolveLocalUserId(req);
    const { productId, quantity } = req.body;

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: 'Invalid product id' });
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be positive integer' });
    }

    const cart = await Cart.findOrCreateByUser(userId);
    const cartId = cart.id;

    const productRes = await pool.query(
      'SELECT id, name, stock FROM products WHERE id = $1',
      [productId]
    );
    if (productRes.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const product = productRes.rows[0];

    const existingRes = await pool.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
      [cartId, productId]
    );

    if (existingRes.rows.length > 0) {
      const newQty = existingRes.rows[0].quantity + quantity;
      if (newQty > product.stock) {
        return res.status(409).json({
          error: 'Insufficient stock',
          details: {
            productId: product.id,
            productName: product.name,
            requested: newQty,
            available: product.stock
          }
        });
      }

      await pool.query(
        'UPDATE cart_items SET quantity = $1 WHERE id = $2',
        [newQty, existingRes.rows[0].id]
      );

      return res.status(201).json({
        message: 'Item added to cart',
        item: { id: existingRes.rows[0].id, productId: product.id, quantity: newQty }
      });
    } else {
      if (quantity > product.stock) {
        return res.status(409).json({
          error: 'Insufficient stock',
          details: {
            productId: product.id,
            productName: product.name,
            requested: quantity,
            available: product.stock
          }
        });
      }

      const insItem = await pool.query(
        'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING id',
        [cartId, productId, quantity]
      );

      return res.status(201).json({
        message: 'Item added to cart',
        item: { id: insItem.rows[0].id, productId: product.id, quantity }
      });
    }
  } catch (err) {
    console.error(err);
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || 'Server error' });
  }
}

/**
 * Checkout cart into order (route: POST /cart/:cartId/checkout)
 */
async function checkout(req, res) {
  const client = await pool.connect();
  try {
    const cartId = Number(req.params.cartId);
    if (!Number.isInteger(cartId) || cartId <= 0) {
      return res.status(400).json({ error: 'Invalid cart id' });
    }

    await client.query('BEGIN');

    const itemsRes = await client.query(
      `
      SELECT ci.product_id, ci.quantity, p.name, p.stock
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.cart_id = $1
      FOR UPDATE
      `,
      [cartId]
    );
    const items = itemsRes.rows;
    if (items.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cart is empty' });
    }

    for (const it of items) {
      if (it.quantity > it.stock) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'Insufficient stock',
          details: {
            productId: it.product_id,
            productName: it.name,
            requested: it.quantity,
            available: it.stock
          }
        });
      }
    }

    for (const it of items) {
      await client.query(
        `UPDATE products SET stock = stock - $1 WHERE id = $2`,
        [it.quantity, it.product_id]
      );
    }

    const userId = await resolveLocalUserId(req);

    const pricesRes = await client.query(
      `
      SELECT ci.product_id, ci.quantity, p.price
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.cart_id = $1
      `,
      [cartId]
    );

    let total = 0;
    for (const r of pricesRes.rows) {
      total += Number(r.price) * Number(r.quantity);
    }

    const orderRes = await client.query(
      `INSERT INTO orders (user_id, status, total_amount)
       VALUES ($1, 'pending', $2)
       RETURNING id, user_id, status, total_amount, created_at`,
      [userId, total]
    );
    const order = orderRes.rows[0];

    for (const r of pricesRes.rows) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [order.id, r.product_id, r.quantity, r.price]
      );
    }

    await client.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId]);

    await client.query('COMMIT');
    return res.status(201).json({ order, message: 'Order placed and stock updated' });
  } catch (err) {
    console.error(err);
    try { await client.query('ROLLBACK'); } catch (_) {}
    return res.status(err.status || 500).json({ error: err.message || 'Server error' });
  } finally {
    client.release();
  }
}

/**
 * Update quantity of a cart item
 */
async function updateItem(req, res) {
  try {
    const userId = await resolveLocalUserId(req);
    const cartItemId = parseInt(req.params.id, 10);
    const { quantity } = req.body;

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }

    const item = await Cart.updateItemQuantity(cartItemId, userId, quantity);
    if (!item) {
      return res.status(404).json({ error: 'Cart item not found' });
    }
    res.json({ item });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Server error' });
  }
}

/**
 * Remove a cart item
 */
async function removeItem(req, res) {
  try {
    const userId = await resolveLocalUserId(req);
    const cartItemId = parseInt(req.params.id, 10);
    const success = await Cart.removeItem(cartItemId, userId);
    if (!success) {
      return res.status(404).json({ error: 'Cart item not found' });
    }
    res.json({ message: 'Cart item removed' });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Server error' });
  }
}

module.exports = {
  getCart,
  addItem,
  checkout,
  updateItem,
  removeItem,
};
