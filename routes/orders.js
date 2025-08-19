// routes/orders.js
const express = require('express');
const authenticateToken = require('../middlewares/auth');
const orderController = require('../controllers/orderController');
const { validationResult } = require('express-validator');
const { idParamRule, updateStatusRules } = require('../validators/order');
const checkAdmin = require('../middlewares/checkAdmin');
const router = express.Router();


router.use(authenticateToken);

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
 *       '200':
 *         description: List of orders for the authenticated user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 *       '401':
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '500':
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', orderController.listOrders);

/**
 * @openapi
 * /orders/{orderId}:
 *   get:
 *     summary: Get a specific order (only if it belongs to the current user)
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the order
 *     responses:
 *       '200':
 *         description: Order with items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderWithItems'
 *       '401':
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '403':
 *         description: Forbidden (order belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '500':
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.get('/:id',
    idParamRule,
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
    orderController.getOrder);

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
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID to update
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
 *       '200':
 *         description: Order status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 order:
 *                   $ref: '#/components/schemas/Order'
 *       '400':
 *         description: Validation error (missing/invalid status or id)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '403':
 *         description: Forbidden (admin only)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '500':
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch(
  '/:id',
  idParamRule,            // validate path id
  updateStatusRules,      // validate body.status
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
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID to cancel/delete
 *     responses:
 *       '204':
 *         description: Order cancelled (user) or deleted (admin)
 *       '400':
 *         description: Validation error (invalid id)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '403':
 *         description: Forbidden (not owner; or user tries to cancel non-pending order)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '500':
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
  orderController.deleteOrder // контроллер проверит роль/владение/статус
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
 *                       id: { type: integer }
 *                       total_amount: { type: number, format: float }
 *                       status: { type: string }
 *                       created_at: { type: string, format: date-time }
 *                       user:
 *                         type: object
 *                         properties:
 *                           id: { type: integer }
 *                           username: { type: string }
 *                           email: { type: string }
 *       401:
 *         description: Missing/invalid token
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
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
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: Order id
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
 *                     id: { type: integer }
 *                     username: { type: string }
 *                     email: { type: string }
 *       400:
 *         description: Invalid id
 *       401:
 *         description: Missing/invalid token
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
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