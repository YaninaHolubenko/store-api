// routes/cart.js
const express = require('express');
const authHybrid = require('../middlewares/authHybrid'); // accepts JWT or session
const cartController = require('../controllers/cartController');
const router = express.Router();
const { validationResult } = require('express-validator');
const { addItem, updateItem, checkoutRules } = require('../validators/cart');

// Use unified hybrid auth for all cart routes
router.use(authHybrid);

/**
 * @openapi
 * /cart:
 *   get:
 *     summary: Retrieve or create the current user's cart
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart retrieved or created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cartId:
 *                   type: integer
 *                   description: ID of the user's cart
 *                 items:
 *                   type: array
 *                   description: Cart items with product info
 *                   items:
 *                     type: object
 *                     properties:
 *                       cart_item_id:
 *                         type: integer
 *                       productId:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       price:
 *                         type: number
 *                         format: float
 *                       image_url:
 *                         type: string
 *                       quantity:
 *                         type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CartAddItemInput'
 *           example:
 *             productId: 1
 *             quantity: 2
 *     responses:
 *       201:
 *         description: Item added or updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 item:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     productId:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Insufficient stock (requested quantity exceeds available stock)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Insufficient stock
 *                 details:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: integer
 *                       example: 5
 *                     productName:
 *                       type: string
 *                       example: Laptop
 *                     requested:
 *                       type: integer
 *                       example: 10
 *                     available:
 *                       type: integer
 *                       example: 3
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/items',
  addItem,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  cartController.addItem
);

/**
 * @openapi
 * /cart/{cartId}/checkout:
 *   post:
 *     summary: Legacy checkout (deprecated)
 *     description: |
 *       This endpoint is **deprecated**.
 *       
 *       Use the Stripe flow instead:
 *       1) `POST /payments/create-intent`
 *       2) `POST /orders/complete`
 *     deprecated: true
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cartId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Cart ID
 *     responses:
 *       410:
 *         description: This endpoint is no longer supported
 */
router.post(
  '/:cartId/checkout',
  checkoutRules,
  (req, res, next) => {
    // reuse already imported validationResult
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  cartController.checkout
);

/**
 * @openapi
 * /cart/items/{id}:
 *   patch:
 *     summary: Update quantity of a specific cart item
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PathId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *             required:
 *               - quantity
 *     responses:
 *       200:
 *         description: Cart item quantity updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 item:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     productId:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch(
  '/items/:id',
  updateItem,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  cartController.updateItem
);

/**
 * @openapi
 * /cart/items/{id}:
 *   delete:
 *     summary: Remove a specific item from the cart
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PathId'
 *     responses:
 *       200:
 *         description: Cart item removed successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/items/:id', cartController.removeItem);

module.exports = router;
