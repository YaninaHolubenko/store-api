// client/src/pages/Checkout.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Container from '../components/Container';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import { useCart } from '../contexts/CartContext';
import OrderSummary from '../components/checkout/OrderSummary';
import PaymentSection from '../components/checkout/PaymentSection';
import styles from './Checkout.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export default function Checkout() {
  const navigate = useNavigate();
  const { items = [], total, count, authRequired, loading, error } = useCart();

  // Finalize order after Stripe confirmation
  async function handlePaid(paymentIntent) {
    try {
      const res = await fetch(`${API_URL}/orders/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ paymentIntentId: paymentIntent?.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data?.error || `Failed to complete order (HTTP ${res.status})`;
        window.alert(msg); // eslint-disable-line no-alert
        return;
      }
      navigate('/orders', { replace: true });
    } catch (e) {
      window.alert(e?.message || 'Failed to complete order'); // eslint-disable-line no-alert
    }
  }

  if (loading) {
    return (
      <Container>
        <div className={styles.loading}>Loading checkout…</div>
      </Container>
    );
  }

  if (authRequired) {
    return (
      <Container>
        <div className={styles.header}>
          <Link to="/cart">← Back to cart</Link>
        </div>

        <h1 className={styles.title}>Checkout</h1>

        <Alert variant="warning">
          Your session has expired. Please sign in to continue.
        </Alert>

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
        <Link to="/cart">← Back to cart</Link>
      </div>

      <h1 className={styles.title}>Checkout</h1>

      {error ? <Alert variant="error">{String(error)}</Alert> : null}

      {!items.length ? (
        <div className={styles.empty}>
          Your cart is empty. <Link to="/">Go shopping</Link>.
        </div>
      ) : (
        <div className={styles.grid}>
          <OrderSummary items={items} total={total} count={count} />
          <div className={styles.paymentCol}>
            <PaymentSection onPaid={handlePaid} />
          </div>
        </div>
      )}
    </Container>
  );
}
