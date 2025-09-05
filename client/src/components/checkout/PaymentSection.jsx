// client/src/components/checkout/PaymentSection.jsx
import React from 'react';
import styles from './PaymentSection.module.css';
import StripeCheckoutBox from './StripeCheckoutBox';

/**
 * Hosts the payment UI. After successful payment, parent can navigate or finalize order.
 * We pass authHeaders down so StripeCheckoutBox can attach the Bearer token to API calls.
 */
export default function PaymentSection({ onPaid, authHeaders }) {
  return (
    <section className={styles.card} aria-label="Payment">
      <h2 className={styles.title}>Payment</h2>
      <StripeCheckoutBox onSuccess={onPaid} authHeaders={authHeaders} />
    </section>
  );
}
