// controllers/cartController.js
const Cart = require('../models/cart');
const pool = require('../db/index');

// Feature flag: allow enabling legacy checkout flow if needed (default: off)
const ENABLE_LEGACY_CHECKOUT = String(process.env.LEGACY_CHECKOUT_ENABLED || '').toLowerCase() === 'true';

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
 * Uses model-level stock enforcement and maps model errors to HTTP.
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

    const { id: cartId } = await Cart.findOrCreateByUser(userId);

    // Delegate to model to avoid duplicating stock logic
    try {
      const row = await Cart.addOrUpdateItem(cartId, productId, quantity);
      // Normalize response to the documented shape
      return res.status(201).json({
        message: 'Item added to cart',
        item: {
          id: row.cart_item_id ?? row.id,
          productId: row.product_id ?? row.productId ?? productId,
          quantity: row.quantity,
        },
      });
    } catch (e) {
      if (e.code === 'PRODUCT_NOT_FOUND') {
        return res.status(404).json({ error: 'Product not found' });
      }
      if (e.code === 'INVALID_QUANTITY') {
        return res.status(400).json({ error: 'Invalid quantity' });
      }
      if (e.code === 'INSUFFICIENT_STOCK') {
        // Keep details if provided by the model
        return res.status(409).json({
          error: 'Insufficient stock',
          details: e.details || { productId, requested: quantity },
        });
      }
      throw e;
    }
  } catch (err) {
    console.error(err);
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || 'Server error' });
  }
}

/**
 * Legacy transactional checkout (original implementation kept under a feature flag).
 * NOTE: This code is preserved for optional fallback/testing and matches the previous logic.
 */
async function legacyCheckoutTransactional(req, res) {
  const client = await pool.connect();
  try {
    const cartId = Number(req.params.cartId);
    if (!Number.isInteger(cartId) || cartId <= 0) {
      return res.status(400).json({ error: 'Invalid cart id' });
    }

    await client.query('BEGIN');

    // Lock items and check stock
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
      if (Number(it.quantity) > Number(it.stock)) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'Insufficient stock',
          details: {
            productId: it.product_id,
            productName: it.name,
            requested: Number(it.quantity),
            available: Number(it.stock),
          }
        });
      }
    }

    // Decrement stock
    for (const it of items) {
      await client.query(
        `UPDATE products SET stock = stock - $1 WHERE id = $2`,
        [it.quantity, it.product_id]
      );
    }

    const userId = await resolveLocalUserId(req);

    // Prices for total
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

    // Create order
    const orderRes = await client.query(
      `INSERT INTO orders (user_id, status, total_amount)
       VALUES ($1, 'pending', $2)
       RETURNING id, user_id, status, total_amount, created_at`,
      [userId, total]
    );
    const order = orderRes.rows[0];

    // Insert order items
    for (const r of pricesRes.rows) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [order.id, r.product_id, r.quantity, r.price]
      );
    }

    // Clear the cart
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
 * Checkout cart into order (route: POST /cart/:cartId/checkout)
 * Default behavior: return 410 (deprecated). If LEGACY_CHECKOUT_ENABLED=true, run legacy flow.
 */
async function checkout(req, res) {
  if (!ENABLE_LEGACY_CHECKOUT) {
    return res.status(410).json({
      error: 'This endpoint is deprecated. Use /payments/create-intent then /orders/complete.',
    });
  }
  // Fallback to legacy behavior if explicitly enabled
  return legacyCheckoutTransactional(req, res);
}

/**
 * Update quantity of a cart item (enforces stock before update)
 */
async function updateItem(req, res) {
  try {
    const userId = await resolveLocalUserId(req);
    const cartItemId = parseInt(req.params.id, 10);
    const { quantity } = req.body;

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }

    // Load product and stock for this cart item owned by the user
    const { rows } = await pool.query(
      `
      SELECT ci.id, ci.quantity AS current_qty, ci.product_id, p.stock
      FROM cart_items ci
      JOIN carts c ON c.id = ci.cart_id AND c.user_id = $2
      JOIN products p ON p.id = ci.product_id
      WHERE ci.id = $1
      `,
      [cartItemId, userId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    const { product_id, stock } = rows[0];
    if (quantity > Number(stock)) {
      return res.status(409).json({
        error: 'Insufficient stock',
        details: {
          productId: Number(product_id),
          requested: Number(quantity),
          available: Number(stock),
        },
      });
    }

    // Proceed with update via model
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
