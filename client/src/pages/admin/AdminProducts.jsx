// client/src/pages/admin/AdminProducts.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import Container from '../../components/Container';
import { useAuth } from '../../contexts/AuthContext';
import styles from './AdminProducts.module.css';
import SafeImage from '../../components/SafeImage';

// Safe env
const API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  'http://localhost:3000';

// Helpers 
function money(v, currency = 'GBP') {
  const n = typeof v === 'number' ? v : Number(v || 0);
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
}
function AuthAwareError({ message }) {
  const m = String(message || '');
  const auth = /token|unauth|forbidden|401|403/i.test(m);
  if (!auth) return <div className={styles.error}>{m}</div>;
  return (
    <div className={styles.error}>
      Your session seems to have expired. Please sign in again.
    </div>
  );
}

// Try to read transitional JWT token from common places (if present). 
function getClientToken() {
  try {
    if (typeof window !== 'undefined') {
      if (window.__token) return window.__token;
      if (window.__authToken) return window.__authToken;
    }
    if (typeof localStorage !== 'undefined') {
      return (
        localStorage.getItem('token') ||
        localStorage.getItem('authToken') ||
        localStorage.getItem('jwt')
      );
    }
    if (typeof sessionStorage !== 'undefined') {
      return (
        sessionStorage.getItem('token') ||
        sessionStorage.getItem('authToken') ||
        sessionStorage.getItem('jwt')
      );
    }
  } catch {}
  return null;
}

//Build headers with optional Bearer token (cookie-first, token as fallback). 
function authHeaders(extra = {}) {
  const t = getClientToken();
  return t ? { ...extra, Authorization: `Bearer ${t}` } : extra;
}

function ProductForm({ initial, categories, onCancel, onSubmit, submitting }) {
  const [form, setForm] = useState(() => ({
    name: initial?.name || '',
    description: initial?.description || '',
    price: initial?.price ?? 0,
    stock: initial?.stock ?? 0,
    image_url: initial?.image_url || '',
    categoryId: initial?.category_id ?? null,
  }));
  const [err, setErr] = useState('');

  function change(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    if (!form.name.trim()) return setErr('Name is required');
    if (Number(form.price) < 0) return setErr('Price must be ≥ 0');
    if (!Number.isFinite(Number(form.stock)) || Number(form.stock) < 0) {
      return setErr('Stock must be ≥ 0');
    }
    onSubmit({
      ...form,
      image_url: typeof form.image_url === 'string' ? form.image_url.trim() : form.image_url,
      price: Number(form.price),
      stock: Number(form.stock),
      // empty string → null
      categoryId:
        form.categoryId === '' || form.categoryId === 'null'
          ? null
          : form.categoryId != null
          ? Number(form.categoryId)
          : null,
    });
  }

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit}>
      <div className={styles.formRow}>
        <label className={styles.label}>Name</label>
        <input
          className={styles.input}
          value={form.name}
          onChange={(e) => change('name', e.target.value)}
          required
        />
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>Description</label>
        <textarea
          className={styles.textarea}
          value={form.description}
          onChange={(e) => change('description', e.target.value)}
          rows={3}
        />
      </div>

      <div className={styles.grid2}>
        <div className={styles.formRow}>
          <label className={styles.label}>Price</label>
          <input
            className={styles.input}
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => change('price', e.target.value)}
          />
        </div>
        <div className={styles.formRow}>
          <label className={styles.label}>Stock</label>
          <input
            className={styles.input}
            type="number"
            min="0"
            step="1"
            value={form.stock}
            onChange={(e) => change('stock', e.target.value)}
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>Image URL</label>
        <input
          className={styles.input}
          type="text"
          placeholder="https://… or /img/example.png"
          value={form.image_url}
          onChange={(e) => change('image_url', e.target.value)}
        />
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>Category</label>
        <select
          className={styles.select}
          value={form.categoryId ?? ''}
          onChange={(e) => change('categoryId', e.target.value)}
        >
          <option value="">— None —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {err && <div className={styles.error}>{err}</div>}

      <div className={styles.actionsRow}>
        <button type="button" className={styles.btnSecondary} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={styles.btnPrimary} disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

export default function AdminProducts() {
  const { isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  // filters
  const [catFilter, setCatFilter] = useState('');
  const [q, setQ] = useState('');

  // form state
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // load categories once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/categories`, { credentials: 'include' });
        const data = await res.json().catch(() => null);
        if (res.ok && Array.isArray(data)) setCategories(data);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // load products (memoized to satisfy eslint deps)
  const fetchProducts = useCallback(async () => {
    setErr('');
    setLoading(true);
    try {
      const url = new URL(`${API_URL}/products`);
      if (catFilter) url.searchParams.set('categoryId', catFilter);
      const res = await fetch(url.toString(), { credentials: 'include' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Failed to load (HTTP ${res.status})`);
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.message || 'Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [catFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((p) => {
      const n = (p.name || '').toLowerCase();
      const d = (p.description || '').toLowerCase();
      return n.includes(needle) || d.includes(needle);
    });
  }, [products, q]);

  function openCreate() {
    setEditing(null);
    setOpenForm(true);
  }
  function openEdit(p) {
    setEditing(p);
    setOpenForm(true);
  }
  function closeForm() {
    setOpenForm(false);
    setEditing(null);
  }

  async function submitForm(payload) {
    setSubmitting(true);
    try {
      if (editing) {
        const res = await fetch(`${API_URL}/products/${editing.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `Update failed (HTTP ${res.status})`);
      } else {
        const res = await fetch(`${API_URL}/products`, {
          method: 'POST',
          credentials: 'include',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `Create failed (HTTP ${res.status})`);
      }
      closeForm();
      await fetchProducts();
    } catch (e) {
      alert(e?.message || 'Save failed'); 
    } finally {
      setSubmitting(false);
    }
  }

  async function removeProduct(id) {
    if (!id) return;
    if (!window.confirm('Delete this product?')) return; 
    setDeletingId(id);
    try {
      const res = await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Delete failed (HTTP ${res.status})`);
      await fetchProducts();
    } catch (e) {
      alert(e?.message || 'Delete failed'); 
    } finally {
      setDeletingId(null);
    }
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <Container>
      <div className={styles.header}>
        <h1>Products (Admin)</h1>
        <div className={styles.filters}>
          <label className={styles.filterLbl}>
            Category:
            <select
              className={styles.select}
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
            >
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <label className={styles.filterLbl}>
            Search:
            <input
              className={styles.input}
              placeholder="Name or description"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>

          <button className={styles.btnPrimary} onClick={openCreate}>Add product</button>
        </div>
      </div>

      {loading && <div className={styles.info}>Loading…</div>}
      {!loading && err && <AuthAwareError message={err} />}
      {!loading && !err && filtered.length === 0 && (
        <div className={styles.info}>No products found.</div>
      )}

      {!loading && !err && filtered.length > 0 && (
        <div className={styles.table} role="table" aria-label="Products">
          <div className={`${styles.tr} ${styles.thead}`} role="row">
            <div className={styles.th} role="columnheader">Product</div>
            <div className={styles.th} role="columnheader">Price</div>
            <div className={styles.th} role="columnheader">Stock</div>
            <div className={styles.th} role="columnheader">Category</div>
            <div className={styles.th} role="columnheader"></div>
          </div>

          {filtered.map((p) => (
            <div key={p.id} className={styles.tr} role="row">
              <div className={styles.td} role="cell">
                <div className={styles.prodCell}>
                  <div className={styles.thumb}>
                    {p.image_url ? (
                      <SafeImage
                        className={styles.thumbImg}
                        src={p.image_url}
                        alt={p.name}
                      />
                    ) : <div className={styles.thumbPlaceholder} />}
                  </div>
                  <div className={styles.prodMain}>
                    <div className={styles.prodName}>{p.name}</div>
                    {p.description ? <div className={styles.sub}>{p.description}</div> : null}
                  </div>
                </div>
              </div>
              <div className={styles.td} role="cell"><strong>{money(p.price)}</strong></div>
              <div className={styles.td} role="cell">{p.stock}</div>
              <div className={styles.td} role="cell">
                {(() => {
                  const c = categories.find((x) => x.id === p.category_id);
                  return c ? c.name : '—';
                })()}
              </div>
              <div className={styles.td} role="cell">
                <div className={styles.rowActions}>
                  <button className={styles.btnSecondary} onClick={() => openEdit(p)}>Edit</button>
                  <button
                    className={styles.btnDanger}
                    onClick={() => removeProduct(p.id)}
                    disabled={deletingId === p.id}
                  >
                    {deletingId === p.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drawer / panel with form */}
      {openForm && (
        <div className={styles.drawer} role="dialog" aria-modal="true">
          <div className={styles.drawerCard}>
            <div className={styles.drawerHeader}>
              <h2>{editing ? 'Edit product' : 'Add product'}</h2>
              <button className={styles.iconBtn} onClick={closeForm} aria-label="Close">×</button>
            </div>
            <ProductForm
              initial={editing}
              categories={categories}
              submitting={submitting}
              onCancel={closeForm}
              onSubmit={submitForm}
            />
          </div>
        </div>
      )}
    </Container>
  );
}
