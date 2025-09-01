// routes/payments.js
const express = require('express');
const router = express.Router();
const authHybrid = require('../middlewares/authHybrid');
const paymentsController = require('../controllers/paymentsController');

/**
 * @openapi
 * /payments/create-intent:
 *   post:
 *     summary: Create a Stripe PaymentIntent for the current user's cart (GBP)
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '201':
 *         description: PaymentIntent created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clientSecret:
 *                   type: string
 *                   example: pi_12345_secret_abcdef
 *                 amount:
 *                   type: integer
 *                   example: 2599
 *                 currency:
 *                   type: string
 *                   example: gbp
 *       '400':
 *         description: Cart is empty or invalid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized
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
router.post('/create-intent', authHybrid, paymentsController.createPaymentIntent);

module.exports = router;
