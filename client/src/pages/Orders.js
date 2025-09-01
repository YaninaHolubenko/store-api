// client/src/pages/Orders.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Container from '../components/Container';
import OrderCard from '../components/OrderCard';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export default function Orders() {
  // NOTE: keep page logic minimal and delegate UI to OrderCard
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const navigate = useNavigate();

  // Load orders list (reused after cancel)
  const loadOrders = useCallback(async (signal) => {
    try {
      setLoading(true);
      setErr(null);
      const res = await fetch(`${API_URL}/orders`, {
        credentials: 'include', // use session cookie
        signal,
      });

      if (res.status === 401) {
        // Not authenticated: redirect to login preserving return path
        navigate('/login', { replace: true, state: { from: '/orders' } });
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Failed to load orders (${res.status})`);
      }

      const data = await res.json();
      // Expecting an array of orders; normalize defensively
      const list = Array.isArray(data) ? data : data?.orders || [];
      setOrders(list);
    } catch (e) {
      // Ignore AbortError
      if (e?.name !== 'AbortError') setErr(e.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const controller = new AbortController();
    loadOrders(controller.signal);
    return () => controller.abort();
  }, [loadOrders]);

  // Cancel order in 'pending' state
  async function cancelOrder(order) {
    // Guard: confirm and status check on client side too
    if (!order || order.status !== 'pending') return;
    const ok = window.confirm(`Cancel order #${order.id}?`); // eslint-disable-line no-alert
    if (!ok) return;

    try {
      const res = await fetch(`${API_URL}/orders/${order.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.status === 204) {
        // Refresh list after successful cancel
        await loadOrders();
        return;
      }
      const data = await res.json().catch(() => null);
      const msg = data?.error || `Failed to cancel (HTTP ${res.status})`;
      window.alert(msg); // eslint-disable-line no-alert
    } catch (e) {
      window.alert(e?.message || 'Failed to cancel'); // eslint-disable-line no-alert
    }
  }

  return (
    <Container>
      {/* Keep headings semantic; styling is handled by Container + OrderCard */}
      <h1>My Orders</h1>

      {loading && <p>Loading…</p>}

      {!loading && err && (
        <p aria-live="polite">{err}</p>
      )}

      {!loading && !err && orders.length === 0 && (
        <p>
          You have no orders yet. <Link to="/">Go shopping</Link>
        </p>
      )}

      {!loading && !err && orders.length > 0 && (
        <div role="list" aria-label="Order list">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} onCancel={cancelOrder} />
          ))}
        </div>
      )}
    </Container>
  );
}
