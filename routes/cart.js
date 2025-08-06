// routes/cart.js
const express = require('express');
const authenticateToken = require('../middlewares/auth');
const cartController = require('../controllers/cartController');
const router = express.Router();

// Require authentication
router.use(authenticateToken);

/**
 * @openapi
 * /cart:
 *   get:
 *     summary: Retrieve or create the current user's cart
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 */
router.get('/', cartController.getCart);

/**
 * @openapi
 * /cart/items:
 *   post:
 *     summary: Add or update a product in the cart
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 */
router.post('/items', cartController.addItem);

/**
 * @openapi
 * /cart/{cartId}/checkout:
 *   post:
 *     summary: Checkout current user's cart to an order
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 */
router.post('/:cartId/checkout', cartController.checkout);

/**
 * @openapi
 * /cart/items/{id}:
 *   patch:
 *     summary: Update quantity of a cart item
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 */
router.patch('/items/:id', cartController.updateItem);

/**
 * @openapi
 * /cart/items/{id}:
 *   delete:
 *     summary: Remove a specific item from the cart
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 */
router.delete('/items/:id', cartController.removeItem);

module.exports = router;
