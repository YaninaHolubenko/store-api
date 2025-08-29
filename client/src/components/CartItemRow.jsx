// CartItemRow: uses shared ImageWithFallback to unify image/fallback behavior
import React from 'react';
import ImageWithFallback from './ui/ImageWithFallback';
import styles from './CartItemRow.module.css';

export default function CartItemRow({ item, onRemove }) {
  const unitPrice = Number(item.price ?? item.unit_price ?? 0);
  const qty = Number(item.quantity ?? item.qty ?? 1) || 1;
  const lineTotal = Number(item.lineTotal ?? item.total ?? unitPrice * qty);

  return (
    <div className={styles.row} role="listitem">
      <div className={styles.imageCell}>
        <ImageWithFallback
          src={item.image || ''}
          alt={item.name || 'Product'}
          className={styles.image}
          placeholderClassName={styles.noImage}
          placeholderText="No image"
          fallbackSrc="https://placehold.co/200x160?text=No+Image"
        />
      </div>

      <div className={styles.info}>
        <div className={styles.name}>{item.name}</div>
        <div className={styles.meta}>Product ID: {item.productId ?? item.product_id ?? '—'}</div>
      </div>

      <div className={styles.price}>£{unitPrice.toFixed(2)}</div>
      <div className={styles.qty}>Qty: {qty}</div>

      <div className={styles.totalAndAction}>
        <div className={styles.lineTotal}>£{lineTotal.toFixed(2)}</div>
        {item.id ? (
          <button className={styles.remove} onClick={() => onRemove(item.id)}>
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}
