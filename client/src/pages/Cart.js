// client\src\pages\Cart.js
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import Container from '../components/Container';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import CartItemRow from '../components/CartItemRow';
import { getItemKey, getQty, getUnitPrice } from '../utils/cart';
import styles from './Cart.module.css';

export default function Cart() {
  const { items = [], count, total, remove, update, loading, error, authRequired } = useCart();

  const { safeCount, safeSubtotal } = useMemo(() => {
    const computedCount = items.reduce((acc, it) => acc + getQty(it), 0);
    const computedTotal = items.reduce((acc, it) => acc + getQty(it) * getUnitPrice(it), 0);
    return {
      safeCount: typeof count === 'number' ? count : computedCount,
      safeSubtotal: typeof total === 'number' ? total : computedTotal,
    };
  }, [items, count, total]);

  if (loading) return <div className={styles.loading}>Loading cart…</div>;

  if (authRequired) {
    return (
      <Container>
        <div className={styles.header}>
          <Link to="/">← Back to products</Link>
        </div>

        <h1 className={styles.title}>Your Cart</h1>

        <Alert variant="warning">Please sign in to view your cart.</Alert>

        <div className={styles.authActions}>
          <Link to="/login" className={styles.link}>
            <Button as="span">Login</Button>
          </Link>
          <Link to="/register" className={styles.link}>
            <Button as="span" variant="outline">Register</Button>
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className={styles.header}>
        <Link to="/">← Back to products</Link>
      </div>

      <h1 className={styles.title}>Your Cart</h1>

      {error ? <Alert variant="error">{String(error)}</Alert> : null}

      {!items.length ? (
        <div className={styles.empty}>
          Your cart is empty.{` `}
          <Link to="/" className={styles.link}>
            Start shopping
          </Link>
          .
        </div>
      ) : (
        <>
          <div role="list" aria-label="Cart items" className={styles.list}>
            {items
              .filter(Boolean) 
              .map((it) => (
                <CartItemRow
                  key={getItemKey(it)}
                  item={it}
                  onRemove={remove}
                  onUpdate={update}
                />
              ))}
          </div>

          <div className={styles.totals}>
            <div className={styles.itemsCount}>
              Items: <strong>{safeCount}</strong>
            </div>
            <div className={styles.subtotal}>
              Subtotal: <strong>£{safeSubtotal.toFixed(2)}</strong>
            </div>
            <Link to="/checkout" className={styles.link}>
              <Button as="span">Proceed to Checkout</Button>
            </Link>
          </div>
        </>
      )}
    </Container>
  );
}
