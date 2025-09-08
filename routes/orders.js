// routes/orders.js
const express = require('express');
const authHybrid = require('../middlewares/authHybrid'); // <-- use hybrid guard
const orderController = require('../controllers/orderController');
const { validationResult } = require('express-validator');
const { idParamRule, updateStatusRules } = require('../validators/order');
const checkAdmin = require('../middlewares/checkAdmin');
const router = express.Router();

router.use(authHybrid); // <-- protect all /orders routes via session OR JWT

/**
 * @openapi
 * /orders:
 *   get:
 *     summary: Get current user's orders
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of orders for the authenticated user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', orderController.listOrders);

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     summary: Get a specific order (only if it belongs to the current user)
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PathId'
 *     responses:
 *       200:
 *         description: Order with items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderWithItems'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/:id',
  idParamRule,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  orderController.getOrder
);

/**
 * @openapi
 * /orders/complete:
 *   post:
 *     summary: Convert the current user's cart into an order after successful Stripe payment
 *     description: Validates Stripe PaymentIntent and creates an order from the user's cart.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *             required:
 *               - paymentIntentId
 *           example:
 *             paymentIntentId: "pi_3S2abcDeF..."
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orderId:
 *                   type: integer
 *                 totalAmount:
 *                   type: number
 *                 status:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/complete', express.json(), orderController.completeAfterPayment);

/**
 * @openapi
 * /orders/{id}:
 *   patch:
 *     summary: Update the status of a specific order (admin only)
 *     tags:
 *       - Orders
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
 *               status:
 *                 type: string
 *                 enum: [pending, shipped, delivered, cancelled]
 *             required:
 *               - status
 *           example:
 *             status: shipped
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 order:
 *                   $ref: '#/components/schemas/Order'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch(
  '/:id',
  idParamRule,
  updateStatusRules,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  checkAdmin,             // <-- only admin can change status
  orderController.updateStatus
);

/**
 * @openapi
 * /orders/{id}:
 *   delete:
 *     summary: Cancel (user, pending only) or delete (admin) a specific order
 *     description: Regular users can cancel **their own** order only if it's in `pending`. Admins can delete any order.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PathId'
 *     responses:
 *       204:
 *         description: Order cancelled (user) or deleted (admin)
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete(
  '/:id',
  idParamRule,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  orderController.deleteOrder // controller checks role/ownership/status
);

// --- Admin: list all orders ---
/**
 * @openapi
 * /orders/admin/orders:
 *   get:
 *     summary: (admin) List all orders with owner info
 *     tags: [Orders]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, shipped, delivered, cancelled]
 *         description: Optional status filter
 *     responses:
 *       200:
 *         description: List of all orders (admin)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       total_amount:
 *                         type: number
 *                         format: float
 *                       status:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           username:
 *                             type: string
 *                           email:
 *                             type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/admin/orders',
  checkAdmin,
  orderController.adminListAll
);

// --- Admin: get any order by id ---
/**
 * @openapi
 * /orders/admin/orders/{id}:
 *   get:
 *     summary: (admin) Get any order with items and owner info
 *     tags: [Orders]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - $ref: '#/components/parameters/PathId'
 *     responses:
 *       200:
 *         description: Order with items and owner
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 order:
 *                   $ref: '#/components/schemas/Order'
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/OrderItem'
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/admin/orders/:id',
  checkAdmin,
  idParamRule,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  orderController.adminGetOne
);

module.exports = router;
