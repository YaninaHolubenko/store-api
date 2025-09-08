// client/src/pages/OrderDetails.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Container from '../components/Container';
import SafeImage from '../components/SafeImage';
import styles from './OrderDetails.module.css';

const API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  'http://localhost:3000';

/* ---------- helpers ---------- */
// Build auth headers from stored JWT
function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Resolve order total in decimal units
function resolveAmount(order) {
  if (Number.isFinite(order?.total_cents)) return order.total_cents / 100;
  const raw = order?.total_amount ?? order?.total ?? null;
  if (raw == null) return null;
  const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(',', '.'));
  return Number.isFinite(num) ? num : null;
}

function formatMoney(value, currency = 'GBP') {
  if (value == null) return '—';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
}

// Normalize items: keep raw image path; SafeImage will resolve absolute URL
function normalizeItems(items, currency = 'GBP') {
  const arr = Array.isArray(items) ? items : [];
  return arr.map((it) => {
    const img =
      it.image || it.image_url || it.imageUrl || it.thumbnail || it.thumb_url ||
      it.product?.image || it.product?.image_url || it.product?.imageUrl || null;

    const productId = it.product_id || it.product?.id || null;
    const name =
      it.title || it.name || it.product?.title || it.product?.name ||
      (productId ? `Product #${productId}` : 'Product');

    const qty = Number(it.quantity ?? 1);
    const price = Number(it.price ?? 0);

    return {
      id: it.order_item_id || it.id,
      productId,
      name,
      image: img || null,
      quantity: qty,
      price,
      lineTotal: price * qty,
      currency,
    };
  });
}
/* ----------------------------- */

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);

  const currency = useMemo(() => order?.currency || 'GBP', [order]);
  const totalFormatted = useMemo(
    () => formatMoney(resolveAmount(order), currency),
    [order, currency]
  );

  const load = useCallback(async (signal) => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch(`${API_URL}/orders/${id}`, {
        credentials: 'include',
        headers: { Accept: 'application/json', ...authHeaders() },
        signal,
      });

      if (res.status === 401 || res.status === 403) {
        navigate('/login', { replace: true, state: { from: `/orders/${id}` } });
        return;
      }

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Failed to load order (HTTP ${res.status})`);

      const ord = data?.order || data;
      if (!ord || !ord.id) throw new Error('Order not found.');
      setOrder(ord);
      setItems(normalizeItems(data?.items || data?.order?.items || [], ord?.currency || 'GBP'));
    } catch (e) {
      setErr(e?.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const isPending = order?.status === 'pending';
  const isCancelled = order?.status === 'cancelled';

  // Cancel order
  async function handleCancel() {
    if (!isPending) return;
    const ok = window.confirm(`Cancel order #${order.id}?`); // eslint-disable-line no-alert
    if (!ok) return;
    try {
      const res = await fetch(`${API_URL}/orders/${order.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { ...authHeaders() },
      });
      if (res.status === 204) {
        await load();
        return;
      }
      if (res.status === 401 || res.status === 403) {
        navigate('/login', { replace: true, state: { from: `/orders/${order.id}` } });
        return;
      }
      const data = await res.json().catch(() => null);
      window.alert(data?.error || `Failed to cancel (HTTP ${res.status})`); // eslint-disable-line no-alert
    } catch (e) {
      window.alert(e?.message || 'Failed to cancel'); // eslint-disable-line no-alert
    }
  }

  return (
    <Container>
      <div className={styles.wrap}>
        <div className={styles.topbar}>
          <Link to="/orders" className={styles.back}>&larr; Back to orders</Link>
        </div>

        {loading && <div className={styles.loading}>Loading order…</div>}
        {!loading && err && <div className={styles.error} role="alert">{err}</div>}

        {!loading && !err && order && (
          <>
            <header className={styles.header}>
              <h1 className={styles.title}>Order #{order.id}</h1>
              <div className={styles.summary}>
                <span className={`${styles.badge} ${isPending ? styles.badgePending : isCancelled ? styles.badgeCancelled : ''}`}>
                  {order.status}
                </span>
                {order.created_at && (
                  <span className={styles.metaItem}>
                    {new Date(order.created_at).toLocaleString()}
                  </span>
                )}
                <span className={styles.total}>
                  <span className={styles.totalLabel}>Total:</span> {totalFormatted}
                </span>
              </div>

              {/* Desktop-only cancel button; hidden on mobile via CSS */}
              {isPending && (
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={handleCancel}
                >
                  Cancel order
                </button>
              )}
            </header>

            <section className={styles.items} aria-label="Order items">
              {items.length === 0 ? (
                <div className={styles.empty}>No items in this order.</div>
              ) : items.map((it) => (
                <article key={it.id || `${it.productId}-${it.name}`} className={styles.item}>
                  <div className={styles.thumb}>
                    {it.image ? (
                      <SafeImage
                        src={it.image}
                        alt={it.name}
                        className={styles.thumbImg}
                        // Neutral inline SVG keeps layout stable when image fails
                        fallback={`<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><rect width="100%" height="100%" fill="%23f3f4f6"/></svg>`}
                        loading="lazy"
                      />
                    ) : (
                      <div className={styles.thumbPlaceholder} aria-hidden="true" />
                    )}
                  </div>

                  <div className={styles.itemInfo}>
                    <div className={styles.itemName}>
                      {it.productId ? (
                        <Link to={`/product/${it.productId}`} className={styles.itemNameLink}>
                          {it.name}
                        </Link>
                      ) : (
                        it.name
                      )}
                    </div>
                    <div className={styles.itemMeta}>
                      <span>Qty: {it.quantity}</span>
                      <span>Unit: {formatMoney(it.price, it.currency)}</span>
                    </div>
                    {it.productId && (
                      <Link to={`/product/${it.productId}`} className={styles.itemLink}>
                        View product
                      </Link>
                    )}
                  </div>

                  <div className={styles.itemTotal}>
                    {formatMoney(it.lineTotal, it.currency)}
                  </div>
                </article>
              ))}
            </section>

            {/* Mobile-only action bar under the list */}
            {isPending && (
              <div className={styles.actionsMobile}>
                <button
                  type="button"
                  className={styles.cancelBtnMobile}
                  onClick={handleCancel}
                >
                  Cancel order
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Container>
  );
}
