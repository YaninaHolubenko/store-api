// routes/cart.js

const express = require('express');
const authenticateToken = require('../middlewares/auth'); // <-- поправлено
const pool = require('../db/index');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /cart - retrieve or create the user's cart
router.get('/', async (req, res) => {
  const userId = req.user.id;
  try {
    // Find or create cart
    let cartResult = await pool.query(
      'SELECT id FROM carts WHERE user_id = $1',
      [userId]
    );
    let cartId;
    if (cartResult.rows.length === 0) {
      const newCart = await pool.query(
        'INSERT INTO carts (user_id) VALUES ($1) RETURNING id',
        [userId]
      );
      cartId = newCart.rows[0].id;
    } else {
      cartId = cartResult.rows[0].id;
    }

    // Retrieve cart items with product details
    const itemsResult = await pool.query(
      `SELECT ci.id AS cart_item_id,
              p.id AS product_id,
              p.name,
              p.description,
              p.price,
              p.image_url,
              ci.quantity
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = $1`,
      [cartId]
    );

    res.json({ cartId, items: itemsResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /cart/items - add or update an item in the cart
router.post('/items', async (req, res) => {
  const userId = req.user.id;
  const { productId, quantity } = req.body;
  try {
    // Validate input
    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid product ID or quantity' });
    }

    // Ensure product exists
    const productCheck = await pool.query(
      'SELECT id FROM products WHERE id = $1',
      [productId]
    );
    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Find or create cart
    let cartResult = await pool.query(
      'SELECT id FROM carts WHERE user_id = $1',
      [userId]
    );
    let cartId;
    if (cartResult.rows.length === 0) {
      const newCart = await pool.query(
        'INSERT INTO carts (user_id) VALUES ($1) RETURNING id',
        [userId]
      );
      cartId = newCart.rows[0].id;
    } else {
      cartId = cartResult.rows[0].id;
    }

    // Check existing cart item
    const existingItem = await pool.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
      [cartId, productId]
    );

    let item;
    if (existingItem.rows.length > 0) {
      // Update quantity
      const newQty = existingItem.rows[0].quantity + quantity;
      const updated = await pool.query(
        'UPDATE cart_items SET quantity = $1 WHERE id = $2 RETURNING id, product_id, quantity',
        [newQty, existingItem.rows[0].id]
      );
      item = updated.rows[0];
    } else {
      // Insert new item
      const inserted = await pool.query(
        'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING id, product_id, quantity',
        [cartId, productId, quantity]
      );
      item = inserted.rows[0];
    }

    res.status(201).json({ cartId, item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /cart/:cartId/checkout - convert cart to an order
router.post('/:cartId/checkout', async (req, res) => {
  const userId = req.user.id;
  const { cartId } = req.params;
  try {
    const itemsRes = await pool.query(
      `SELECT ci.product_id, ci.quantity, p.price
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = $1`,
      [cartId]
    );
    const items = itemsRes.rows;
    if (items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const totalAmount = items.reduce((sum, itm) => sum + itm.price * itm.quantity, 0);

    const orderRes = await pool.query(
      'INSERT INTO orders (user_id, total_amount) VALUES ($1, $2) RETURNING id, total_amount, status, created_at',
      [userId, totalAmount]
    );
    const order = orderRes.rows[0];

    await Promise.all(
      items.map(itm =>
        pool.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
          [order.id, itm.product_id, itm.quantity, itm.price]
        )
      )
    );

    await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);

    res.status(201).json({ orderId: order.id, totalAmount, status: order.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /cart/items/:id - update quantity for a specific cart item
router.patch('/items/:id', async (req, res) => {
  const userId = req.user.id;
  const cartItemId = req.params.id;
  const { quantity } = req.body;
  try {
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }

    const ownership = await pool.query(
      `SELECT ci.id FROM cart_items ci
       JOIN carts c ON ci.cart_id = c.id
       WHERE ci.id = $1 AND c.user_id = $2`,
      [cartItemId, userId]
    );
    if (ownership.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    const result = await pool.query(
      'UPDATE cart_items SET quantity = $1 WHERE id = $2 RETURNING id, product_id, quantity',
      [quantity, cartItemId]
    );

    res.json({ item: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /cart/items/:id - remove a specific cart item
router.delete('/items/:id', async (req, res) => {
  const userId = req.user.id;
  const cartItemId = req.params.id;
  try {
    const ownership = await pool.query(
      `SELECT ci.id FROM cart_items ci
       JOIN carts c ON ci.cart_id = c.id
       WHERE ci.id = $1 AND c.user_id = $2`,
      [cartItemId, userId]
    );
    if (ownership.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    await pool.query('DELETE FROM cart_items WHERE id = $1', [cartItemId]);

    res.json({ message: 'Cart item removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
