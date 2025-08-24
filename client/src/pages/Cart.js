// Cart page: list items, allow removing, show totals
import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';

export default function Cart() {
  // Grab cart state, including authRequired flag
  const { items, count, total, remove, loading, error, refresh, authRequired } = useCart();

  if (loading) return <div style={{ padding: '1rem' }}>Loading cart…</div>;

  // Friendly state for unauthenticated users
  if (authRequired) {
    return (
      <div style={{ padding: '1rem', maxWidth: 800, margin: '0 auto' }}>
        <div style={{ marginBottom: 12 }}>
          <Link to="/">← Back to products</Link>
        </div>

        <h1 style={{ marginTop: 0 }}>Your Cart</h1>

        <div
          style={{
            background: '#fff7e6',
            color: '#6a3d00',
            padding: '12px 14px',
            borderRadius: 8,
            border: '1px solid #ffd9a6',
            marginBottom: 12,
          }}
        >
          Please sign in to view your cart.
          <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
            <Link
              to="/login"
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #222',
                background: '#111',
                color: '#fff',
                textDecoration: 'none',
              }}
            >
              Login
            </Link>
            <Link
              to="/register"
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #222',
                background: '#fff',
                color: '#111',
                textDecoration: 'none',
              }}
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/">← Back to products</Link>
      </div>

      <h1 style={{ marginTop: 0 }}>Your Cart</h1>

      {error ? (
        <div
          style={{
            background: '#ffe6e6',
            color: '#a40000',
            padding: '8px 12px',
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          {error}{' '}
          <button onClick={refresh} style={{ marginLeft: 8 }}>
            Retry
          </button>
        </div>
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
              <div
                key={it.id ?? `${it.productId}-${it.name}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 1fr 140px 120px 120px',
                  gap: 12,
                  alignItems: 'center',
                  border: '1px solid #eee',
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <div>
                  {it.image ? (
                    <img
                      src={it.image}
                      alt={it.name}
                      style={{ width: 100, height: 80, objectFit: 'cover', borderRadius: 6 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 100,
                        height: 80,
                        background: '#f4f4f4',
                        borderRadius: 6,
                        display: 'grid',
                        placeItems: 'center',
                        color: '#888',
                      }}
                    >
                      No image
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{it.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Product ID: {it.productId ?? '—'}</div>
                </div>
                <div>£{Number(it.price).toFixed(2)}</div>
                <div>Qty: {it.quantity}</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <div style={{ fontWeight: 700 }}>£{Number(it.lineTotal).toFixed(2)}</div>
                  {it.id ? (
                    <button
                      onClick={() => remove(it.id)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: '1px solid #c00',
                        background: '#fff0f0',
                        color: '#c00',
                      }}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
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
            <button
              disabled
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid #222',
                background: '#ddd',
                color: '#555',
              }}
            >
              Checkout (coming soon)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
