// config/stripe.js
// Initialize Stripe server SDK once and reuse.
// Requires STRIPE_SECRET_KEY in environment variables.

let stripe = null;

/**
 * Get a singleton Stripe instance.
 * Throws a clear error if STRIPE_SECRET_KEY is not configured.
 */
function getStripe() {
  if (stripe) return stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('Stripe secret key is not configured. Set STRIPE_SECRET_KEY in your environment.');
  }

  // eslint-disable-next-line global-require
  const Stripe = require('stripe');
  stripe = new Stripe(key, {
    apiVersion: '2024-06-20', // lock API version for stability
  });
  return stripe;
}

module.exports = { getStripe };
