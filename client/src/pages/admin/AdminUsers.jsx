// client/src/pages/admin/AdminUsers.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Container from '../../components/Container';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import styles from './AdminUsers.module.css';
import prodStyles from './AdminProducts.module.css'; // reuse input/select styles from Products

const API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  'http://localhost:3000';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function Pagination({ total = 0, limit = 20, offset = 0, onChange }) {
  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + limit, total);

  return (
    <div className={styles.pagination}>
      <Button
        type="button"
        aria-label="Previous page"
        onClick={() => onChange(Math.max(0, offset - limit))}
        disabled={page <= 1}
      >
        ← Prev
      </Button>
      <span className={styles.paginationInfo}>
        Page {page} / {totalPages} &nbsp;•&nbsp; {start}-{end} of {total}
      </span>
      <Button
        type="button"
        aria-label="Next page"
        onClick={() => onChange(Math.min((totalPages - 1) * limit, offset + limit))}
        disabled={page >= totalPages}
      >
        Next →
      </Button>
    </div>
  );
}

function UsersTable({ users = [] }) {
  if (!users.length) {
    return <div className={styles.message}>No users found.</div>;
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table} aria-label="Users table">
        <thead>
          <tr>
            <th className={styles.th}>ID</th>
            <th className={styles.th}>Username</th>
            <th className={styles.th}>Email</th>
            <th className={styles.th}>Role</th>
            <th className={styles.th}>Created</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td className={styles.tdMono}>{u.id}</td>
              <td className={styles.td}>{u.username || '—'}</td>
              <td className={styles.td}>{u.email || '—'}</td>
              <td className={`${styles.td} ${u.role === 'admin' ? styles.roleAdmin : styles.role}`}>
                {u.role || 'user'}
              </td>
              <td className={styles.td}>
                {u.created_at ? new Date(u.created_at).toLocaleString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminUsers() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (limit) params.set('limit', String(limit));
    if (offset) params.set('offset', String(offset));
    return params.toString();
  }, [search, limit, offset]);

  const load = useCallback(
    async (signal) => {
      setLoading(true);
      setErr('');
      try {
        const res = await fetch(`${API_URL}/users/admin?${query}`, {
          credentials: 'include',
          headers: { Accept: 'application/json', ...authHeaders() },
          signal,
        });

        if (res.status === 401 || res.status === 403) {
          navigate('/login', { replace: true, state: { from: '/admin/users' } });
          return;
        }

        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `Failed to load users (HTTP ${res.status})`);

        setUsers(Array.isArray(data?.users) ? data.users : []);
        setTotal(Number.isFinite(data?.total) ? data.total : 0);
      } catch (e) {
        if (e?.name !== 'AbortError') setErr(e?.message || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    },
    [query, navigate]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function handleSubmit(e) {
    e.preventDefault();
    setOffset(0);
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <Container>
      <div className={styles.header}>
        <Link to="/admin" aria-label="Back to admin dashboard">← Back</Link>
        <h1 style={{ margin: 0 }}>Users</h1>
      </div>

      <form onSubmit={handleSubmit} className={styles.toolbar}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username or email"
          aria-label="Search users"
          className={`${prodStyles.input} ${styles.searchInput}`}  // look from Products + flex-grow
        />
        <select
          value={limit}
          onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setOffset(0); }}
          aria-label="Rows per page"
          className={prodStyles.select}
        >
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>
        <Button type="submit" aria-label="Search users">Search</Button>
      </form>

      {loading && <div className={styles.message}>Loading…</div>}
      {!loading && err && <div role="alert" className={styles.error}>{err}</div>}

      {!loading && !err && (
        <>
          <UsersTable users={users} />
          <Pagination total={total} limit={limit} offset={offset} onChange={(n) => setOffset(n)} />
        </>
      )}
    </Container>
  );
}
