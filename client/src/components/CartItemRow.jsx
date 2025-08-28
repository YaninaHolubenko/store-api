import React from 'react';
import styles from './CartItemRow.module.css';

export default function CartItemRow({ item, onRemove }) {
  return (
    <div className={styles.row}>
      <div className={styles.imageCell}>
        {item.image ? (
          <img src={item.image} alt={item.name} className={styles.image} />
        ) : (
          <div className={styles.noImage}>No image</div>
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.name}>{item.name}</div>
        <div className={styles.meta}>Product ID: {item.productId ?? '—'}</div>
      </div>

      <div className={styles.price}>£{Number(item.price).toFixed(2)}</div>
      <div className={styles.qty}>Qty: {item.quantity}</div>

      <div className={styles.totalAndAction}>
        <div className={styles.lineTotal}>£{Number(item.lineTotal).toFixed(2)}</div>
        {item.id ? (
          <button className={styles.remove} onClick={() => onRemove(item.id)}>
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}
