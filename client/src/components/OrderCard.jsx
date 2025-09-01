// client/src/components/OrderCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import styles from './OrderCard.module.css';

export default function OrderCard({ order, onCancel }) {
  // NOTE: Keep presentational; delegate actions via props
  const pending = order?.status === 'pending';

  return (
    <div className={styles.card} role="listitem" aria-label={`Order #${order.id}`}>
      <div className={styles.left}>
        <div className={styles.title}>Order #{order.id}</div>
        <div className={styles.meta}>
          <span className={pending ? styles.badgePending : styles.badge}>{order.status}</span>
          {order.created_at ? (
            <span className={styles.date}>
              {new Date(order.created_at).toLocaleString()}
            </span>
          ) : null}
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.amount}>
          {order.total_amount != null ? `$${Number(order.total_amount).toFixed(2)}` : null}
        </div>

        <Link to={`/orders/${order.id}`} className={styles.link}>
          View details
        </Link>

        {pending && typeof onCancel === 'function' ? (
          <button
            type="button"
            className={styles.cancel}
            onClick={() => onCancel(order)}
            aria-label={`Cancel order #${order.id}`}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}
