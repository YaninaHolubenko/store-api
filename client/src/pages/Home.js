// Home page: products grid with search and category filter (client-side filtering)
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getProducts, getCategories } from '../api';

// Normalize helpers keep code resilient to different API shapes
function normalizeProducts(raw) {
  // Accept either { products: [...] } or an array
  const list = Array.isArray(raw?.products) ? raw.products : Array.isArray(raw) ? raw : [];
  return list.map((p) => ({
    id: p.id ?? p.product_id ?? p._id,
    name: p.name ?? p.title ?? 'Product',
    description: p.description ?? '',
    price: Number(p.price ?? 0),
    image: p.image_url ?? p.imageUrl ?? p.image ?? null,
    // Try to carry category info if present (by id or by name)
    categoryId: p.category_id ?? p.categoryId ?? null,
    categoryName: p.category ?? p.category_name ?? null,
    stock: p.stock ?? p.quantity ?? null,
  }));
}

function normalizeCategories(raw) {
  // Accept either { categories:[{id,name}...] }, an array of objects, or array of strings
  const list = Array.isArray(raw?.categories) ? raw.categories : Array.isArray(raw) ? raw : [];
  return list.map((c, i) => {
    if (typeof c === 'string') return { id: i + 1, name: c, displayName: toTitle(c) };
    return {
      id: c.id ?? c.category_id ?? c._id ?? i + 1,
      name: c.name ?? c.slug ?? c.title ?? 'category',
      displayName: c.display_name ?? toTitle(c.name ?? c.slug ?? c.title ?? 'category'),
    };
  });
}

function toTitle(s) {
  if (!s) return '';
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}

// Escape user input before embedding in RegExp
function escapeReg(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function Home() {
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI state
  const [search, setSearch] = useState('');
  // Initialize category from URL (?category=ID)
  const initialSelectedCat = (() => {
    const sp = new URLSearchParams(window.location.search);
    const byId = sp.get('category');
    return byId ? Number(byId) : null;
  })();
  const [selectedCatId, setSelectedCatId] = useState(initialSelectedCat); // null = All

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [pRaw, cRaw] = await Promise.all([getProducts(), getCategories().catch(() => [])]);
        if (!cancelled) {
          setAllProducts(normalizeProducts(pRaw));
          setCategories(normalizeCategories(cRaw));
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load products');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Sync selected category with URL (?category or ?categoryName)
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const byId = sp.get('category');
    const byName = sp.get('categoryName');

    if (byId) {
      setSelectedCatId(Number(byId));
      return;
    }
    if (byName && categories.length) {
      const found = categories.find(
        (c) => (c.name || '').toLowerCase() === byName.toLowerCase()
      );
      setSelectedCatId(found ? Number(found.id) : null);
      return;
    }
    if (!byId && !byName) {
      setSelectedCatId(null);
    }
  }, [location.search, categories]);

  // Build quick lookup map
  const catById = useMemo(() => {
    const m = new Map();
    categories.forEach((c) => m.set(Number(c.id), c));
    return m;
  }, [categories]);

  // Filtering logic (client-side)
  const filtered = useMemo(() => {
    const selectedId = selectedCatId != null ? Number(selectedCatId) : null;
    const q = search.trim();
    // Word-start match: \b<query>, case-insensitive
    const re = q ? new RegExp(`\\b${escapeReg(q)}`, 'i') : null;

    return allProducts.filter((p) => {
      // 1) Category check (by id if present, fallback by name)
      let inCategory = true;
      if (selectedId != null) {
        const pid = p.categoryId != null ? Number(p.categoryId) : null;
        if (pid != null) {
          inCategory = pid === selectedId;
        } else {
          const prodCatName = (p.categoryName ?? '').toString().toLowerCase();
          const selName = (catById.get(selectedId)?.name ?? '').toLowerCase();
          inCategory = !!prodCatName && !!selName && prodCatName === selName;
        }
      }
      if (!inCategory) return false;

      // 2) Search only in product name and category name, from the start of a word
      if (!re) return true;
      const name = p.name || '';
      const catName = p.categoryName || '';
      return re.test(name) || re.test(catName);
    });
  }, [allProducts, search, selectedCatId, catById]);

  // Compute category link for product card
  function productCategory(p) {
    const pid = p.categoryId != null ? Number(p.categoryId) : null;
    if (p.categoryName) {
      return { label: toTitle(p.categoryName), href: `/?categoryName=${encodeURIComponent(p.categoryName)}` };
    }
    if (pid != null && catById.has(pid)) {
      const c = catById.get(pid);
      return { label: c.displayName || toTitle(c.name), href: `/?category=${pid}` };
    }
    if (pid != null) {
      return { label: `Category #${pid}`, href: `/?category=${pid}` };
    }
    return null;
  }

  // Change selected category and push it to URL
  const selectCategory = (id) => {
    setSelectedCatId(id);
    if (id == null) navigate('/');
    else navigate(`/?category=${id}`);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20, padding: '1rem' }}>
      {/* Sidebar: categories */}
      <aside style={{ borderRight: '1px solid #eee', paddingRight: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Categories</div>
        <div style={{ display: 'grid', gap: 6 }}>
          <button
            onClick={() => selectCategory(null)}
            style={{
              textAlign: 'left',
              padding: '8px 10px',
              borderRadius: 8,
              border: selectedCatId === null ? '2px solid #111' : '1px solid #ccc',
              background: selectedCatId === null ? '#111' : '#fff',
              color: selectedCatId === null ? '#fff' : '#111',
              cursor: 'pointer',
            }}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => selectCategory(Number(c.id))}
              style={{
                textAlign: 'left',
                padding: '8px 10px',
                borderRadius: 8,
                border: Number(selectedCatId) === Number(c.id) ? '2px solid #111' : '1px solid #ccc',
                background: Number(selectedCatId) === Number(c.id) ? '#111' : '#fff',
                color: Number(selectedCatId) === Number(c.id) ? '#fff' : '#111',
                cursor: 'pointer',
              }}
              title={c.name}
            >
              {c.displayName || toTitle(c.name)}
            </button>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <main>
        {/* Search */}
        <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #ccc',
            }}
          />
        {(search || selectedCatId !== null) && (
            <button
              onClick={() => { setSearch(''); selectCategory(null); }}
              style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', background: '#f7f7f7' }}
            >
              Reset
            </button>
          )}
        </div>

        {/* States */}
        {loading && <div>Loading…</div>}
        {error && !loading && (
          <div style={{ background: '#ffe6e6', color: '#a40000', padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* Products grid */}
        {!loading && !error && (
          <>
            {!filtered.length ? (
              <div>No products match your filters.</div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 16,
                }}
              >
                {filtered.map((p) => {
                  const cat = productCategory(p);
                  return (
                    <div key={p.id} style={{ border: '1px solid #eee', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ width: '100%', height: 160, background: '#f7f7f7' }}>
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x400?text=No+Image'; }}
                          />
                        ) : null}
                      </div>

                      {/* Card body */}
                      <div style={{ padding: 12, display: 'grid', gap: 6 }}>
                        <div style={{ fontWeight: 600, minHeight: 40 }}>{p.name}</div>

                        {/* Always render category row with fixed height to keep button aligned */}
                        <div style={{ fontSize: 12, opacity: 0.7, height: 18, display: 'flex', alignItems: 'center' }}>
                          {cat && (
                            <Link to={cat.href} style={{ textDecoration: 'none' }}>
                              {cat.label}
                            </Link>
                          )}
                        </div>

                        <div style={{ fontWeight: 700 }}>£{p.price.toFixed(2)}</div>

                        <Link
                          to={`/product/${p.id}`}
                          style={{
                            textDecoration: 'none',
                            display: 'inline-block',
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: '1px solid #222',
                            background: '#111',
                            color: '#fff',
                            textAlign: 'center',
                          }}
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
