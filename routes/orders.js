// routes/orders.js
const express = require('express');
const authenticateToken = require('../middlewares/auth');
const orderController = require('../controllers/orderController');
const router = express.Router();

router.use(authenticateToken);

/**
 * @openapi
 * /orders:
 *   get:
 *     summary: Retrieve all orders for current user
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
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
 */
router.get('/:id', orderController.getOrder);

/**
 * @openapi
 * /orders/{id}:
 *   patch:
 *     summary: Update the status of a specific order
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id', orderController.updateStatus);

/**
 * @openapi
 * /orders/{id}:
 *   delete:
 *     summary: Cancel or delete a specific order
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', orderController.deleteOrder);

module.exports = router;