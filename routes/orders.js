// routes/orders.js
const express = require('express');
const authenticateToken = require('../middlewares/auth');
const orderController = require('../controllers/orderController');
const { validationResult } = require('express-validator');
const { idParamRule, updateStatusRules } = require('../validators/order');
const router = express.Router();


router.use(authenticateToken);

/**
 * @openapi
 * /orders:
 *   get:
 *     summary: Retrieve all orders for the current user
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: A list of orders
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
 *                         example: 123
 *                       total_amount:
 *                         type: number
 *                         format: float
 *                         example: 149.99
 *                       status:
 *                         type: string
 *                         example: pending
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-08-09T10:15:30.000Z
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
 * /orders/{id}:
 *   get:
 *     summary: Retrieve details of a specific order
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
 *         description: Order ID to retrieve
 *     responses:
 *       '200':
 *         description: Order details with items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 order:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 123
 *                     total_amount:
 *                       type: number
 *                       format: float
 *                       example: 149.99
 *                     status:
 *                       type: string
 *                       example: pending
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-08-09T10:15:30.000Z
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       order_item_id:
 *                         type: integer
 *                         example: 456
 *                       product_id:
 *                         type: integer
 *                         example: 7
 *                       name:
 *                         type: string
 *                         example: Wireless Mouse
 *                       description:
 *                         type: string
 *                         example: Ergonomic 2.4GHz mouse
 *                       quantity:
 *                         type: integer
 *                         example: 2
 *                       price:
 *                         type: number
 *                         format: float
 *                         example: 29.99
 *       '401':
 *         description: Missing or invalid token
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
 *     summary: Update the status of a specific order
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
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 123
 *                     total_amount:
 *                       type: number
 *                       format: float
 *                       example: 149.99
 *                     status:
 *                       type: string
 *                       example: shipped
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-08-09T10:15:30.000Z
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
router.patch('/:id',
    updateStatusRules,
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
    orderController.updateStatus);

/**
 * @openapi
 * /orders/{id}:
 *   delete:
 *     summary: Cancel or delete a specific order
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
 *         description: Order ID to delete
 *     responses:
 *       '204':
 *         description: Order deleted successfully (No Content)
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
router.delete('/:id',
    idParamRule,
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
    orderController.deleteOrder);

module.exports = router;