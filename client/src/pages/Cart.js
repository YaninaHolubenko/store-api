// Cart page: list items, allow removing, show totals
import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import Container from '../components/Container';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import CartItemRow from '../components/CartItemRow';

export default function Cart() {
  const { items, count, total, remove, loading, error, refresh, authRequired } = useCart();

  if (loading) return <div style={{ padding: '1rem' }}>Loading cart…</div>;

  // Friendly state for unauthenticated users
  if (authRequired) {
    return (
      <Container>
        <div style={{ marginBottom: 12 }}>
          <Link to="/">← Back to products</Link>
        </div>

        <h1 style={{ marginTop: 0 }}>Your Cart</h1>

        <Alert variant="warning">Please sign in to view your cart.</Alert>

        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/login" style={{ textDecoration: 'none' }}>
            <Button as="span">Login</Button>
          </Link>
          <Link to="/register" style={{ textDecoration: 'none' }}>
            <Button
              as="span"
              style={{ background: '#fff', color: '#111', border: '1px solid #222' }}
            >
              Register
            </Button>
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div style={{ marginBottom: 12 }}>
        <Link to="/">← Back to products</Link>
      </div>

      <h1 style={{ marginTop: 0 }}>Your Cart</h1>

      {error ? (
        <Alert variant="error">
          {error} <button onClick={refresh} style={{ marginLeft: 8 }}>Retry</button>
        </Alert>
      ) : null}

      {!items.length ? (
        <div style={{ padding: '1rem 0' }}>
          Your cart is empty.{' '}
          <Link to="/" style={{ textDecoration: 'none' }}>
            Start shopping
          </Link>
          .
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 12 }}>
            {items.map((it) => (
              <CartItemRow
                key={it.id ?? `${it.productId}-${it.name}`}
                item={it}
                onRemove={remove}
              />
            ))}
          </div>

          <div
            style={{
              marginTop: 20,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 16,
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: 16 }}>
              Items: <strong>{count}</strong>
            </div>
            <div style={{ fontSize: 18 }}>
              Subtotal: <strong>£{total.toFixed(2)}</strong>
            </div>
            <Button disabled>Checkout (coming soon)</Button>
          </div>
        </>
      )}
    </Container>
  );
}
