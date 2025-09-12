// client\src\pages\Home.js
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getProducts, getCategories } from '../api';
import SearchBar from '../components/SearchBar';
import CategoriesList from '../components/CategoriesList';
import ProductsGrid from '../components/ProductsGrid';
import Alert from '../components/ui/Alert';
import { normalizeProducts, normalizeCategories } from '../utils/normalize';
import { toTitle, escapeReg } from '../utils/format';
import styles from './Home.module.css';

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

  // sync from URL (?category or ?categoryName)
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

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
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
        {loading && <div className={styles.loading}>Loading…</div>}
        {!loading && error && <Alert variant="error">{error}</Alert>}

        {/* Products grid */}
        {!loading && !error && (
          filtered.length ? (
            <ProductsGrid products={filtered} categoryOf={productCategory} />
          ) : (
            <div className={styles.empty}>No products match your filters.</div>
          )
        )}
      </main>
    </div>
  );
}
