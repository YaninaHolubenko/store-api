// client/src/components/CartItemRow.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import SafeImage from './SafeImage';
import styles from './CartItemRow.module.css';

export default function CartItemRow({ item, onRemove, onUpdate }) {
  // Guard against accidental undefined items
  if (!item) return null;

  // Cart line id (what backend usually expects for update/remove)
  const cartItemId =
    item.id ??
    item.item_id ??
    item.cart_item_id ??
    null;

  // Product id (only for links/fallback)
  const pid =
    item.productId ??
    item.product_id ??
    item.product?.id ??
    null;

  // Prefer cart line id for updates; fallback to product id
  const updateKey = cartItemId ?? pid ?? null;

  // Money/qty with safe fallbacks
  const unitPrice = Number(
    item.price ??
    item.unit_price ??
    item.product?.price ??
    0
  );

  const qty = Math.max(1, Number(item.quantity ?? item.qty ?? 1) || 1);

  const lineTotal = Number.isFinite(Number(item.lineTotal))
    ? Number(item.lineTotal)
    : unitPrice * qty;

  // Prefer product-linked fields; SafeImage will resolve relative URLs
  const rawSrc =
    item.image ||
    item.image_url ||
    item.imageUrl ||
    item.product?.image ||
    item.product?.image_url ||
    item.product?.imageUrl ||
    '';

  function clamp(val) {
    const n = Math.max(1, Number(val) || 1);
    const max = Number.isFinite(Number(item.stock)) ? Number(item.stock) : undefined;
    return typeof max === 'number' ? Math.min(n, max) : n;
  }

  function handleDecrement() {
    if (!onUpdate || updateKey == null) return;
    if (qty > 1) onUpdate(updateKey, clamp(qty - 1));
  }

  function handleIncrement() {
    if (!onUpdate || updateKey == null) return;
    onUpdate(updateKey, clamp(qty + 1));
  }

  function handleChange(e) {
    if (!onUpdate || updateKey == null) return;
    const val = parseInt(e.target.value, 10);
    if (!Number.isNaN(val) && val > 0) onUpdate(updateKey, clamp(val));
  }

  const imageEl = rawSrc ? (
    <SafeImage
      src={rawSrc}
      alt={item.name || 'Product'}
      className={styles.image}
      // Neutral 200x160 fallback keeps tile height stable
      fallback={`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="160"><rect width="100%" height="100%" fill="%23f3f4f6"/></svg>`}
      loading="lazy"
    />
  ) : (
    <div className={styles.image} aria-hidden="true" />
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
        <div className={styles.meta}>Product ID: {pid ?? '—'}</div>
      </div>

      <div className={styles.price}>£{unitPrice.toFixed(2)}</div>

      {/* Quantity controls */}
      <div className={styles.qty}>
        <button
          onClick={handleDecrement}
          aria-label="Decrease quantity"
          disabled={qty <= 1 || updateKey == null}
          type="button"
        >
          –
        </button>
        <input
          type="number"
          value={qty}
          min={1}
          onChange={handleChange}
          aria-label="Quantity"
          inputMode="numeric"
          {...(Number.isFinite(Number(item.stock)) ? { max: Number(item.stock) } : {})}
          disabled={updateKey == null}
        />
        <button
          onClick={handleIncrement}
          aria-label="Increase quantity"
          type="button"
          disabled={updateKey == null || (Number.isFinite(Number(item.stock)) ? qty >= Number(item.stock) : false)}
        >
          +
        </button>
      </div>

      <div className={styles.totalAndAction}>
        <div className={styles.lineTotal}>£{lineTotal.toFixed(2)}</div>
        {cartItemId != null ? (
          <button
            className={styles.remove}
            onClick={() => onRemove?.(cartItemId)}
            type="button"
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}
