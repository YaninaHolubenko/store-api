// Home page: products grid with search and category filter (client-side filtering)
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getProducts, getCategories } from '../api';
import SearchBar from '../components/SearchBar';
import CategoriesList from '../components/CategoriesList';

// Normalize helpers keep code resilient to different API shapes
function normalizeProducts(raw) {
  const list = Array.isArray(raw?.products) ? raw.products : Array.isArray(raw) ? raw : [];
  return list.map((p) => ({
    id: p.id ?? p.product_id ?? p._id,
    name: p.name ?? p.title ?? 'Product',
    description: p.description ?? '',
    price: Number(p.price ?? 0),
    image: p.image_url ?? p.imageUrl ?? p.image ?? null,
    categoryId: p.category_id ?? p.categoryId ?? null,
    categoryName: p.category ?? p.category_name ?? null,
    stock: p.stock ?? p.quantity ?? null,
  }));
}

function normalizeCategories(raw) {
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

function escapeReg(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// simple viewport helper (для сетки)
function useViewportWidth() {
  const [w, setW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1024));
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return w;
}

export default function Home() {
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');

  // init from URL (?category=)
  const initialSelectedCat = (() => {
    const sp = new URLSearchParams(window.location.search);
    const byId = sp.get('category');
    return byId ? Number(byId) : null;
  })();
  const [selectedCatId, setSelectedCatId] = useState(initialSelectedCat);

  const location = useLocation();
  const navigate = useNavigate();
  const width = useViewportWidth();
  const isDesktop = width > 900;

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
    })();
    return () => { cancelled = true; };
  }, []);

  // sync из URL (?category или ?categoryName)
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const byId = sp.get('category');
    const byName = sp.get('categoryName');

    if (byId) {
      setSelectedCatId(Number(byId));
      return;
    }
    if (byName && categories.length) {
      const found = categories.find((c) => (c.name || '').toLowerCase() === byName.toLowerCase());
      setSelectedCatId(found ? Number(found.id) : null);
      return;
    }
    if (!byId && !byName) setSelectedCatId(null);
  }, [location.search, categories]);

  const catById = useMemo(() => {
    const m = new Map();
    categories.forEach((c) => m.set(Number(c.id), c));
    return m;
  }, [categories]);

  const filtered = useMemo(() => {
    const selectedId = selectedCatId != null ? Number(selectedCatId) : null;
    const q = search.trim();
    const re = q ? new RegExp(`\\b${escapeReg(q)}`, 'i') : null;

    return allProducts.filter((p) => {
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

      if (!re) return true;
      const name = p.name || '';
      const catName = p.categoryName || '';
      return re.test(name) || re.test(catName);
    });
  }, [allProducts, search, selectedCatId, catById]);

  function productCategory(p) {
    const pid = p.categoryId != null ? Number(p.categoryId) : null;
    if (p.categoryName) {
      return { label: toTitle(p.categoryName), href: `/?categoryName=${encodeURIComponent(p.categoryName)}` };
    }
    if (pid != null && catById.has(pid)) {
      const c = catById.get(pid);
      return { label: c.displayName || toTitle(c.name), href: `/?category=${pid}` };
    }
    if (pid != null) return { label: `Category #${pid}`, href: `/?category=${pid}` };
    return null;
  }

  const selectCategory = (id) => {
    setSelectedCatId(id);
    if (id == null) navigate('/');
    else navigate(`/?category=${id}`);
  };

  const layoutStyle = {
    display: 'grid',
    gridTemplateColumns: isDesktop ? '240px 1fr' : '1fr',
    gap: 20,
    padding: '1rem',
  };

  return (
    <div style={layoutStyle}>
      {/* Sidebar on desktop; collapsible list on mobile handled by component CSS */}
      <aside style={{ borderRight: isDesktop ? '1px solid #eee' : 'none', paddingRight: isDesktop ? 12 : 0 }}>
        <CategoriesList
          categories={categories}
          selectedId={selectedCatId}
          onSelect={selectCategory}
          title="Categories"
        />
      </aside>

      <main>
        {/* Search */}
        <SearchBar
          value={search}
          onChange={setSearch}
          onReset={() => { setSearch(''); selectCategory(null); }}
        />

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
                      <div style={{ padding: 12, display: 'grid', gap: 6, gridTemplateRows: 'auto 18px auto auto' }}>
                        <div style={{ fontWeight: 600, minHeight: 40 }}>{p.name}</div>

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
