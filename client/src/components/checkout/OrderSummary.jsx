// client/src/components/checkout/OrderSummary.jsx
import React, { useMemo } from 'react';
import styles from './OrderSummary.module.css';

/**
 * Displays cart totals using provided items/total/count.
 * Calculates defensively when numbers are missing.
 */
export default function OrderSummary({ items = [], total, count }) {
  const { safeCount, safeSubtotal } = useMemo(() => {
    const c = items.reduce((acc, it) => acc + Number(it.quantity ?? it.qty ?? 1), 0);
    const t = items.reduce((acc, it) => {
      const price = Number(it.price ?? it.unit_price ?? 0);
      const q = Number(it.quantity ?? it.qty ?? 1);
      return acc + price * q;
    }, 0);
    return {
      safeCount: typeof count === 'number' ? count : c,
      safeSubtotal: typeof total === 'number' ? total : t,
    };
  }, [items, total, count]);

  return (
    <section className={styles.card} aria-label="Order summary">
      <h2 className={styles.title}>Order Summary</h2>
      <div className={styles.line}>
        <span>Items</span>
        <strong>{safeCount}</strong>
      </div>
      <div className={styles.line}>
        <span>Subtotal</span>
        <strong>£{safeSubtotal.toFixed(2)}</strong>
      </div>
    </section>
  );
}
