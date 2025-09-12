// client/src/pages/Orders.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Container from '../components/Container';
import OrderCard from '../components/OrderCard';
import styles from './Orders.module.css';

const API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  'http://localhost:3000';

// helpers (module scope) 
// Extract first item (title + image) from order details payload
function pickFirstItem(details) {
  const arr =
    details?.items ||
    details?.order_items ||
    details?.orderItems ||
    details?.lines ||
    details?.products ||
    details?.cart_items ||
    details?.details ||
    [];
  const it = Array.isArray(arr) && arr.length ? arr[0] : null;
  if (!it) return null;

  const title =
    it.title ||
    it.name ||
    it.product?.title ||
    it.product?.name ||
    it.product_title ||
    null;

  const imageRaw =
    it.image ||
    it.image_url ||
    it.imageUrl ||
    it.thumbnail ||
    it.thumb_url ||
    it.product?.image ||
    it.product?.image_url ||
    it.product?.imageUrl ||
    it.product_image_url ||
    null;

  return {
    title: title || null,
    // Pass raw value; SafeImage will resolve relative URLs later
    image: imageRaw || null,
  };
}

// Build auth headers from stored JWT
function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [thumbs, setThumbs] = useState({}); // { [orderId]: { title, image } }
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const navigate = useNavigate();

  const loadOrders = useCallback(
    async (signal) => {
      try {
        setLoading(true);
        setErr(null);

        // 1) Load orders list
        const res = await fetch(`${API_URL}/orders`, {
          credentials: 'include',
          headers: { Accept: 'application/json', ...authHeaders() },
          signal,
        });

        if (res.status === 401 || res.status === 403) {
          navigate('/login', { replace: true, state: { from: '/orders' } });
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || `Failed to load orders (${res.status})`);
        }

        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.orders || [];
        setOrders(list);

        // 2) Prefer preview fields from the list response (server-side optimization)
        const initialThumbs = {};
        const needFetchIds = [];
        for (const o of list) {
          const t = (o.preview_title ?? o.preview_image_url)
            ? {
                title: o.preview_title || null,
                // Keep raw value; SafeImage in OrderCard will resolve it
                image: o.preview_image_url || null,
              }
            : null;

          if (t) {
            initialThumbs[o.id] = t;
          } else {
            needFetchIds.push(o.id);
          }
        }

        // 3) If some orders lack preview, fetch their details just for the first item thumbnail
        if (needFetchIds.length) {
          const details = await Promise.all(
            needFetchIds.map((id) =>
              fetch(`${API_URL}/orders/${id}`, {
                credentials: 'include',
                headers: { Accept: 'application/json', ...authHeaders() },
                signal,
              })
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null)
            )
          );

          details.forEach((d, i) => {
            const first = pickFirstItem(d);
            if (first) initialThumbs[needFetchIds[i]] = first;
          });
        }

        setThumbs(initialThumbs);
      } catch (e) {
        if (e?.name !== 'AbortError') setErr(e.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadOrders(controller.signal);
    return () => controller.abort();
  }, [loadOrders]);

  // Cancel order in 'pending' state
  async function cancelOrder(order) {
    if (!order || order.status !== 'pending') return;
    const ok = window.confirm(`Cancel order #${order.id}?`); // eslint-disable-line no-alert
    if (!ok) return;

    try {
      const res = await fetch(`${API_URL}/orders/${order.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { ...authHeaders() },
      });
      if (res.status === 204) {
        await loadOrders();
        return;
      }
      if (res.status === 401 || res.status === 403) {
        navigate('/login', { replace: true, state: { from: '/orders' } });
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
      <h1 className={styles.heading}>My Orders</h1>

      {loading && <p className={styles.message}>Loading…</p>}

      {!loading && err && <p className={styles.error} aria-live="polite">{err}</p>}

      {!loading && !err && orders.length === 0 && (
        <p className={styles.message}>
          You have no orders yet. <Link to="/">Go shopping</Link>
        </p>
      )}

      {!loading && !err && orders.length > 0 && (
        <div role="list" aria-label="Order list" className={styles.list}>
          {orders.map((o) => (
            <OrderCard
              key={o.id}
              order={{ ...o, firstItem: thumbs[o.id] || null }}
              onCancel={cancelOrder}
            />
          ))}
        </div>
      )}
    </Container>
  );
}
