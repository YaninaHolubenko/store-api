import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Container from '../../components/Container';
import { useAuth } from '../../contexts/AuthContext';
import styles from './AdminOrders.module.css';

// Safe env resolution (no direct import.meta access)
const API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  'http://localhost:3000';

// Build auth headers from stored JWT (hybrid auth also supports session cookie)
function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Allowed statuses for admin update
const STATUSES = ['pending', 'shipped', 'delivered', 'cancelled'];

// Money formatter
function formatMoney(value, currency = 'GBP') {
  const num = typeof value === 'number' ? value : Number(value || 0);
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(num);
}

/** Friendly error for auth-related messages */
function AuthAwareError({ message }) {
  const m = String(message || '');
  const lower = m.toLowerCase();
  const authLike =
    lower.includes('token') ||
    lower.includes('unauth') ||
    lower.includes('forbidden') ||
    lower.includes('401') ||
    lower.includes('403');

  if (!authLike) {
    return <div className={styles.error}>{m}</div>;
  }

  return (
    <div className={styles.error}>
      Your session seems to have expired. Please sign in again to view admin orders.{' '}
      <Link to="/login">Go to login</Link>
    </div>
  );
}

export default function AdminOrders() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [userQuery, setUserQuery] = useState(''); // filter by user
  const [edits, setEdits] = useState({});   // { [orderId]: 'shipped' }
  const [saving, setSaving] = useState({}); // { [orderId]: boolean }

  // Load orders (admin only)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr('');

        if (!isAdmin) {
          if (!cancelled) {
            setOrders([]);
            setLoading(false);
          }
          return;
        }

        const url = new URL(`${API_URL}/orders/admin/orders`);
        if (statusFilter) url.searchParams.set('status', statusFilter);

        const res = await fetch(url.toString(), {
          credentials: 'include',
          headers: { Accept: 'application/json', ...authHeaders() }, // ← add Bearer if present
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const msg = data?.error || `Failed to load orders (HTTP ${res.status})`;
          throw new Error(msg);
        }

        const list = Array.isArray(data?.orders) ? data.orders : [];
        if (!cancelled) setOrders(list);
      } catch (e) {
        if (!cancelled) {
          setErr(e?.message || 'Failed to load orders');
          setOrders([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isAdmin, statusFilter]);

  // Normalize rows for table
  const rows = useMemo(() => {
    if (!isAdmin) return [];
    return orders.map(o => ({
      id: o.id,
      status: o.status,
      created_at: o.created_at,
      total: o.total_amount,
      currency: o.currency || 'GBP',
      user: o.user || { id: o.user_id, username: o.username, email: o.email },
    }));
  }, [orders, isAdmin]);

  // Client-side filtering by username/email (case-insensitive)
  const filteredRows = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => {
      const name = (r.user?.username || '').toLowerCase();
      const email = (r.user?.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [rows, userQuery]);

  function changeEdit(id, value) {
    setEdits(prev => ({ ...prev, [id]: value }));
  }

  async function saveStatus(id) {
    const nextStatus = edits[id];
    if (!nextStatus) return;

    setSaving(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`${API_URL}/orders/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders() }, // ← add Bearer if present
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data?.error || `Failed to update (HTTP ${res.status})`;
        window.alert(msg);
        return;
      }

      setOrders(curr => curr.map(o => (o.id === id ? { ...o, status: nextStatus } : o)));
      setEdits(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } catch (e) {
      window.alert(e?.message || 'Update failed');
    } finally {
      setSaving(prev => ({ ...prev, [id]: false }));
    }
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <Container>
      <div className={styles.header}>
        <h1>Orders (Admin)</h1>
        <div className={styles.filters}>
          <label className={styles.filterLbl}>
            Status:
            <select
              className={styles.select}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              {STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          {/* User search */}
          <label className={styles.filterLbl}>
            <span>User:</span>
            <input
              className={styles.input}
              type="text"
              placeholder="Search by name or email"
              value={userQuery}
              onChange={e => setUserQuery(e.target.value)}
            />
          </label>
        </div>
      </div>

      {loading && <div className={styles.info}>Loading…</div>}
      {!loading && err && <AuthAwareError message={err} />}
      {!loading && !err && filteredRows.length === 0 && (
        <div className={styles.info}>No orders found.</div>
      )}

      {!loading && !err && filteredRows.length > 0 && (
        <div className={styles.table} role="table" aria-label="Orders list">
          <div className={`${styles.tr} ${styles.thead}`} role="row">
            <div className={styles.th} role="columnheader">Order</div>
            <div className={styles.th} role="columnheader">User</div>
            <div className={styles.th} role="columnheader">Created</div>
            <div className={styles.th} role="columnheader">Total</div>
            <div className={styles.th} role="columnheader">Status</div>
            <div className={styles.th} role="columnheader" />
          </div>

          {filteredRows.map(row => {
            const edited = edits[row.id] ?? row.status;
            const changed = edited !== row.status;

            return (
              <div key={row.id} className={styles.tr} role="row">
                <div className={styles.td} role="cell">
                  <Link to={`/admin/orders/${row.id}`}>#{row.id}</Link>
                </div>
                <div className={styles.td} role="cell">
                  {row.user?.username || row.user?.email || `User #${row.user?.id || '?'}`}
                  {row.user?.email ? <div className={styles.sub}>{row.user.email}</div> : null}
                </div>
                <div className={styles.td} role="cell">
                  {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                </div>
                <div className={styles.td} role="cell">
                  <strong>{formatMoney(row.total, row.currency)}</strong>
                </div>
                <div className={styles.td} role="cell">
                  <select
                    className={styles.select}
                    value={edited}
                    onChange={e => changeEdit(row.id, e.target.value)}
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.td} role="cell">
                  <button
                    className={styles.saveBtn}
                    disabled={!changed || saving[row.id]}
                    onClick={() => saveStatus(row.id)}
                  >
                    {saving[row.id] ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Container>
  );
}
