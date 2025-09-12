// controllers/paymentsController.js
const { getStripe } = require('../config/stripe');
const Cart = require('../models/cart');

/*
  Convert a decimal price in GBP pounds to an integer amount in the smallest currency unit (pence).
  Rounds to nearest penny to avoid floating point artifacts.
 */
function toPence(value) {
  // value may come as string or number (pg "numeric"). We normalize carefully.
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/*
  Compute the total amount (in pence) for the current user's active cart.
  Uses server-side prices from the database to prevent client-side tampering.
 */
async function computeCartAmountInPence(userId) {
  // 1) Get (or create) user's cart
  const { id: cartId } = await Cart.findOrCreateByUser(userId);

  // 2) Fetch items + product prices from DB
  const items = await Cart.getItemsWithProductDetails(cartId);

  // 3) Sum in pence to avoid float issues
  let amount = 0;
  for (const it of items) {
    const pricePence = toPence(it.price);
    const qty = Number(it.quantity) || 0;
    amount += pricePence * qty;
  }
  return { amount, cartId, items };
}

/*
  POST /payments/create-intent
  Creates a Stripe PaymentIntent for the current user's cart total.
  Returns client_secret for client-side confirmation.
 */
async function createPaymentIntent(req, res) {
  try {
    // Ensure we have an authenticated user (authHybrid middleware should enforce this)
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Compute amount in the smallest currency unit from server-side cart
    const { amount, cartId, items } = await computeCartAmountInPence(userId);

    // Explicit and user-friendly checks
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Cart total is zero' });
    }

    const stripe = getStripe();

    // Use currency from env (default gbp). Stripe expects lower-case ISO code.
    const currency = String(process.env.STRIPE_CURRENCY || 'gbp').toLowerCase();

    // Optional idempotency-key support to avoid duplicate charges on retries
    // Client can send: 'Idempotency-Key: <uuid>'
    const idempotencyKey = req.get('Idempotency-Key');

    const createParams = {
      amount,
      currency,
      // Automatic payment methods simplify payment method selection
      automatic_payment_methods: { enabled: true },
      metadata: {
        app_user_id: String(userId),
        app_cart_id: String(cartId),
        // NOTE: do NOT put sensitive data in metadata
      },
    };

    const intent = await stripe.paymentIntents.create(
      createParams,
      idempotencyKey ? { idempotencyKey } : undefined
    );

    return res.status(201).json({
      clientSecret: intent.client_secret,
      amount,   // in the smallest currency unit (e.g., pence)
      currency, // e.g., 'gbp'
    });
  } catch (err) {
    // Log internal details for diagnostics; return generic message to client
    console.error('[payments.create-intent] error:', err);
    return res.status(500).json({ error: 'Failed to create payment intent' });
  }
}

module.exports = {
  createPaymentIntent,
};
