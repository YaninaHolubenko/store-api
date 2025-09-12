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
 *       201:
 *         description: PaymentIntent created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentIntentCreatedResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/create-intent', authHybrid, paymentsController.createPaymentIntent);

module.exports = router;
