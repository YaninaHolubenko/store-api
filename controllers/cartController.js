// controllers/cartController.js
const Cart = require('../models/cart');
const pool = require('../db/index'); // DB pool (ensure this path matches your project)

/**
 * Retrieve or create current user's cart
 */
async function getCart(req, res) {
  try {
    const userId = req.user.id;
    const cart = await Cart.findOrCreateByUser(userId);
    const items = await Cart.getItemsWithProductDetails(cart.id);
    res.json({ cartId: cart.id, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Add product to cart or update quantity (route: POST /cart/items)
 * Finds/creates cart for current user; validates product & stock; upserts quantity.
 */
async function addItem(req, res) {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    // basic validation
    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: 'Invalid product id' });
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be positive integer' });
    }

    // 1) ensure cart exists for this user
    const cart = await Cart.findOrCreateByUser(userId);
    const cartId = cart.id;

    // 2) check product & stock
    const productRes = await pool.query(
      'SELECT id, name, stock FROM products WHERE id = $1',
      [productId]
    );
    if (productRes.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const product = productRes.rows[0];

    // 3) existing cart item?
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
    return res.status(500).json({ error: 'Server error' });
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

    // 1) lock items+products
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

    // 2) validate stock
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

    // 3) decrement stock
    for (const it of items) {
      await client.query(
        `UPDATE products SET stock = stock - $1 WHERE id = $2`,
        [it.quantity, it.product_id]
      );
    }

    // 4) create order + calc total
    const userId = req.user.id;
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

    // 5) order_items from cart snapshot
    for (const r of pricesRes.rows) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [order.id, r.product_id, r.quantity, r.price]
      );
    }

    // 6) clear cart
    await client.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId]);

    await client.query('COMMIT');
    return res.status(201).json({ order, message: 'Order placed and stock updated' });
  } catch (err) {
    console.error(err);
    try { await client.query('ROLLBACK'); } catch (_) {}
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
}

/**
 * Update quantity of a cart item
 */
async function updateItem(req, res) {
  try {
    const userId = req.user.id;
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
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Remove a cart item
 */
async function removeItem(req, res) {
  try {
    const userId = req.user.id;
    const cartItemId = parseInt(req.params.id, 10);
    const success = await Cart.removeItem(cartItemId, userId);
    if (!success) {
      return res.status(404).json({ error: 'Cart item not found' });
    }
    res.json({ message: 'Cart item removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  getCart,
  addItem,
  checkout,
  updateItem,
  removeItem,
};
