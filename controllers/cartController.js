// controllers/cartController.js
const Cart = require('../models/cart');

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
 * Add product to cart or update quantity
 */
async function addItem(req, res) {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid product ID or quantity' });
    }

    const cart = await Cart.findOrCreateByUser(userId);
    const item = await Cart.addOrUpdateItem(cart.id, productId, quantity);
    res.status(201).json({ cartId: cart.id, item });
  } catch (err) {
    console.error(err);
    if (err.message === 'Product not found') {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Checkout cart into order
 */
async function checkout(req, res) {
  try {
    const userId = req.user.id;
    const cartId = parseInt(req.params.cartId, 10);
    const result = await Cart.checkoutCart(cartId, userId);
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    if (err.message === 'Cart empty') {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    res.status(500).json({ error: 'Server error' });
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
