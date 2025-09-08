//client/src/pages/admin/AdminOrderDetails.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import Container from '../../components/Container';
import { useAuth } from '../../contexts/AuthContext';
import SafeImage from '../../components/SafeImage';
import styles from './AdminOrderDetails.module.css';

const API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  'http://localhost:3000';

const STATUSES = ['pending', 'shipped', 'delivered', 'cancelled'];

function formatMoney(v, currency = 'GBP') {
  const num = typeof v === 'number' ? v : Number(v || 0);
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(num);
}

export default function AdminOrderDetails() {
  const { isAdmin } = useAuth();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [order, setOrder] = useState(null);   // { id, status, total_amount, created_at, ...}
  const [items, setItems] = useState([]);     // [{ product_id, name, image_url, quantity, price }, ...]
  const [user, setUser] = useState(null);     // { id, username, email }
  const [editStatus, setEditStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr('');
        const res = await fetch(`${API_URL}/orders/admin/orders/${id}`, { credentials: 'include' });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          const msg = data?.error || `Failed to load order (HTTP ${res.status})`;
          throw new Error(msg);
        }

        if (!cancelled) {
          setOrder(data.order);
          setItems(Array.isArray(data.items) ? data.items : []);
          setUser(data.user || null);
          setEditStatus(data.order?.status || 'pending');
        }
      } catch (e) {
        if (!cancelled) setErr(e?.message || 'Failed to load order');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const total = useMemo(() => (
    order?.total_amount ?? items.reduce((s, it) => s + (Number(it.price) * Number(it.quantity || 1)), 0)
  ), [order, items]);

  async function saveStatus() {
    if (!editStatus || !order) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/orders/${order.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: editStatus }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data?.error || `Failed to update (HTTP ${res.status})`;
        window.alert(msg);
        return;
      }
      setOrder(o => ({ ...o, status: editStatus }));
    } catch (e) {
      window.alert(e?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <Container>
      <div className={styles.header}>
        <Link to="/admin/orders" className={styles.back}>&larr; Back to orders</Link>
        <h1>Order #{id}</h1>
      </div>

      {loading && <div className={styles.info}>Loading…</div>}
      {!loading && err && (
        <div className={styles.error}>
          {/token|unauth|403|401/i.test(err) ? (
            <>Your session seems to have expired. Please <Link to="/login">sign in</Link> again.</>
          ) : err}
        </div>
      )}

      {!loading && !err && order && (
        <>
          <div className={styles.summary}>
            <div className={styles.row}>
              <span className={styles.label}>Status:</span>
              <select
                className={styles.select}
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button
                className={styles.saveBtn}
                onClick={saveStatus}
                disabled={saving || editStatus === order.status}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>

            <div className={styles.row}>
              <span className={styles.label}>Created:</span>
              <span>{order.created_at ? new Date(order.created_at).toLocaleString() : '—'}</span>
            </div>

            <div className={styles.row}>
              <span className={styles.label}>Customer:</span>
              <span>
                {user?.username || user?.email || `User #${user?.id || '?'}`}
                {user?.email ? <span className={styles.sub}> &lt;{user.email}&gt;</span> : null}
              </span>
            </div>

            <div className={styles.row}>
              <span className={styles.label}>Total:</span>
              <strong>{formatMoney(total)}</strong>
            </div>
          </div>

          <h2 className={styles.itemsTitle}>Items</h2>
          <div className={styles.items}>
            {items.map((it) => {
              const line = Number(it.price) * Number(it.quantity || 1);
              // Prefer product image fields; SafeImage will resolve relative URLs
              const rawSrc = it.image_url || it.product_image_url || it.image || it.thumbnail;

              return (
                <div key={it.order_item_id || `${it.product_id}-${it.name}`} className={styles.item}>
                  <div className={styles.thumb}>
                    {rawSrc ? (
                      <SafeImage
                        src={rawSrc}
                        alt={it.name || `Product #${it.product_id}`}
                        className={styles.thumbImg}
                        loading="lazy"
                      />
                    ) : (
                      <div className={styles.thumbPlaceholder} aria-hidden="true" />
                    )}
                  </div>

                  <div className={styles.itemMain}>
                    <Link className={styles.prodLink} to={`/product/${it.product_id}`}>
                      {it.name || `Product #${it.product_id}`}
                    </Link>
                    <div className={styles.sub}>
                      Qty: {it.quantity} &nbsp; • &nbsp; Unit: {formatMoney(it.price)}
                    </div>
                  </div>

                  <div className={styles.itemTotal}>{formatMoney(line)}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Container>
  );
}
