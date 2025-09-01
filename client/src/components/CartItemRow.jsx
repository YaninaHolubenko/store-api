// client/src/components/CartItemRow.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import ImageWithFallback from './ui/ImageWithFallback';
import styles from './CartItemRow.module.css';

export default function CartItemRow({ item, onRemove, onUpdate }) {
  const unitPrice = Number(item.price ?? item.unit_price ?? 0);
  const qty = Number(item.quantity ?? item.qty ?? 1) || 1;
  const lineTotal = Number(item.lineTotal ?? item.total ?? unitPrice * qty);
  const pid = item.productId ?? item.product_id ?? null;

  function handleDecrement() {
    if (qty > 1) {
      onUpdate(item.id, qty - 1);
    }
  }

  function handleIncrement() {
    onUpdate(item.id, qty + 1);
  }

  function handleChange(e) {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val > 0) {
      onUpdate(item.id, val);
    }
  }

  const imageEl = (
    <ImageWithFallback
      src={item.image || ''}
      alt={item.name || 'Product'}
      className={styles.image}
      placeholderClassName={styles.noImage}
      placeholderText="No image"
      fallbackSrc="https://placehold.co/200x160?text=No+Image"
    />
  );

  return (
    <div className={styles.row} role="listitem">
      <div className={styles.imageCell}>
        {pid ? (
          <Link
            to={`/product/${pid}`}
            aria-label={`View details for ${item.name || `product #${pid}`}`}
            className={styles.thumbLink}
          >
            {imageEl}
          </Link>
        ) : (
          imageEl
        )}
      </div>

      <div className={styles.info}>
        {pid ? (
          <Link to={`/product/${pid}`} className={styles.nameLink}>
            <div className={styles.name}>{item.name}</div>
          </Link>
        ) : (
          <div className={styles.name}>{item.name}</div>
        )}
        <div className={styles.meta}>
          Product ID: {pid ?? '—'}
        </div>
      </div>

      <div className={styles.price}>£{unitPrice.toFixed(2)}</div>

      {/* Quantity controls */}
      <div className={styles.qty}>
        <button
          onClick={handleDecrement}
          aria-label="Decrease quantity"
          disabled={qty <= 1}
        >
          –
        </button>
        <input
          type="number"
          value={qty}
          min={1}
          onChange={handleChange}
          aria-label="Quantity"
        />
        <button
          onClick={handleIncrement}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      <div className={styles.totalAndAction}>
        <div className={styles.lineTotal}>£{lineTotal.toFixed(2)}</div>
        {item.id ? (
          <button
            className={styles.remove}
            onClick={() => onRemove(item.id)}
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}
