// client/src/components/OrderCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import SafeImage from './SafeImage';
import styles from './OrderCard.module.css';

const API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  'http://localhost:3000';

// Make image URL absolute when a relative path is provided
function toAbsUrl(src) {
  if (!src) return null;
  if (/^(https?:)?\/\//i.test(src) || /^data:/i.test(src)) return src;
  const slash = src.startsWith('/') ? '' : '/';
  return `${API_URL}${slash}${src}`;
}

export default function OrderCard({ order, onCancel }) {
  // Prefer pre-fetched firstItem passed from Orders.js
  const firstItem = order?.firstItem || getFirstItem(order);

  // Normalize image src (support relative paths)
  const imgSrc = toAbsUrl(firstItem?.image);

  // Money formatting
  const currency = order?.currency || 'GBP';
  const amountValue = resolveAmount(order);
  const formattedAmount =
    amountValue != null
      ? new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amountValue)
      : '—';

  const isPending = order?.status === 'pending';

  return (
    <div className={styles.card} role="listitem" aria-label={`Order #${order?.id}`}>
      {/* Left: thumbnail + title/meta */}
      <div className={styles.left}>
        <div className={styles.thumb}>
          {imgSrc ? (
            <SafeImage
              src={imgSrc}
              alt={firstItem?.title || 'Order item'}
              className={styles.thumbImg}
              // keep layout stable with neutral 64x64 fallback
              fallbackSvg={`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="100%" height="100%" fill="%23f3f4f6"/></svg>`}
            />
          ) : (
            <div className={styles.thumbPlaceholder} aria-hidden="true" />
          )}
        </div>

        <div className={styles.main}>
          <div className={styles.title}>
            Order #{order?.id}
            {firstItem?.title ? <span className={styles.subtitle}> • {firstItem.title}</span> : null}
          </div>

          <div className={styles.meta}>
            <span className={isPending ? styles.badgePending : styles.badge}>{order?.status}</span>
            {order?.created_at ? (
              <span className={styles.date}>{new Date(order.created_at).toLocaleString()}</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Right: amount + actions */}
      <div className={styles.right}>
        {formattedAmount && (
          <div className={styles.amount} aria-label="Order total">
            <span className={styles.amountLabel}>Total:</span> {formattedAmount}
          </div>
        )}

        <Link to={`/orders/${order?.id}`} className={styles.link}>
          View details
        </Link>

        {isPending && typeof onCancel === 'function' ? (
          <button
            type="button"
            className={styles.cancel}
            onClick={() => onCancel(order)}
            aria-label={`Cancel order #${order?.id}`}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Resolve first item when order.firstItem is not provided */
function getFirstItem(order) {
  const pools = [order?.items, order?.orderItems, order?.lines, order?.products, order?.cart_items].filter(Array.isArray);
  const items = pools.length ? pools[0] : null;
  const item = Array.isArray(items) && items.length ? items[0] : null;
  if (!item) return null;

  const title = item.title || item.name || item.product?.title || item.product?.name || null;
  const image =
    item.image ||
    item.image_url ||
    item.imageUrl ||
    item.product?.image ||
    item.product?.image_url ||
    item.product?.imageUrl ||
    null;

  return { title, image };
}

/** Resolve order total in decimal units */
function resolveAmount(order) {
  if (Number.isFinite(order?.total_cents)) return order.total_cents / 100;
  const raw =
    order?.total_amount != null
      ? order.total_amount
      : order?.total != null
      ? order.total
      : null;
  if (raw == null) return null;
  const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(',', '.'));
  return Number.isFinite(num) ? num : null;
}
