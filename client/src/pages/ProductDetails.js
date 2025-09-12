// client\src\pages\ProductDetails.js
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import Container from '../components/Container';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { getCategories } from '../api';
import { fetchJSON } from '../utils/http';
import { normalizeProduct } from '../utils/normalize';
import { resolveCategoryMeta } from '../utils/categories';
import QuantitySelector from '../components/QuantitySelector';
import SafeImage from '../components/SafeImage';
import styles from './ProductDetails.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export default function ProductDetails() {
  const { id } = useParams();
  const { isAuth } = useAuth();
  const { items, refresh: refreshCart, add } = useCart();

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [product, setProduct] = useState(null);

  const [categories, setCategories] = useState([]);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState('');

  const noticeTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        clearTimeout(noticeTimerRef.current);
        noticeTimerRef.current = null;
      }
    };
  }, []);

  // Load product + categories (categories are non-blocking)
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setPageError('');
      try {
        const data = await fetchJSON(`${API_URL}/products/${id}`, { signal: controller.signal });
        if (cancelled) return;
        const p = normalizeProduct(data);
        if (!p || !p.id) throw new Error('Product not found');
        setProduct(p);
        setQty(1);
      } catch (e) {
        if (!cancelled) setPageError(e?.message || 'Failed to load product');
      } finally {
        if (!cancelled) setLoading(false);
      }

      try {
        const catsRaw = await getCategories();
        if (cancelled) return;
        const list = Array.isArray(catsRaw?.categories)
          ? catsRaw.categories
          : Array.isArray(catsRaw)
          ? catsRaw
          : [];
        setCategories(list);
      } catch {
        // non-critical
      }
    }

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [id]);

  const alreadyInCart = useMemo(() => {
    if (!product?.id) return 0;
    const row = items.find((it) => Number(it.productId) === Number(product.id));
    return Number(row?.quantity || 0);
  }, [items, product]);

  const remainingToAdd = useMemo(() => {
    const stock = Number(product?.stock ?? 0);
    return Math.max(0, stock - alreadyInCart);
  }, [product, alreadyInCart]);

  // Map technical errors to friendly text
  function friendlyCartError(err) {
    const msg = String(err?.message || '');
    if (err?.status === 401 || /unauth|forbidden|token/i.test(msg)) {
      return 'Please sign in to add items to your cart.';
    }
    if (err?.status === 409 || /stock|quantity/i.test(msg)) {
      return 'Insufficient stock for the requested quantity.';
    }
    if (/HTTP\s+\d+/.test(msg)) {
      return 'Could not add to cart. Please try again.';
    }
    return msg || 'Could not add to cart. Please try again.';
  }

  // Add to cart with client-side guard against exceeding stock
  const onAddToCart = async () => {
    if (!product?.id) return;
    setAdding(true);
    setPageError('');
    setNotice('');

    try {
      const requested = Math.max(1, Number(qty) || 1);

      if (remainingToAdd <= 0) {
        setPageError('Insufficient stock for the requested quantity.');
        return;
      }
      if (requested > remainingToAdd) {
        setPageError(`Only ${remainingToAdd} left in stock.`);
        return;
      }

      await add(product.id, requested);
      await refreshCart();
      setNotice('Added to cart ✓');
    } catch (e) {
      setPageError(friendlyCartError(e));
    } finally {
      setAdding(false);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = setTimeout(() => setNotice(''), 2000);
    }
  };

  const isOutOfStock = useMemo(() => remainingToAdd <= 0, [remainingToAdd]);

  if (loading) return <div className={styles.loading}>Loading…</div>;
  if (pageError && !product) {
    return (
      <Container>
        <div className={styles.backLink}>
          <Link to="/">← Back to products</Link>
        </div>
        <Alert variant="error">{pageError}</Alert>
      </Container>
    );
  }
  if (!product) return <div className={styles.notFound}>Product not found.</div>;

  const price = product.price != null ? `£${Number(product.price).toFixed(2)}` : '';
  const img = product.image_url || product.image || '';
  const cat = resolveCategoryMeta(product, categories);

  return (
    <Container>
      <div className={styles.backLink}>
        <Link to="/">← Back to products</Link>
      </div>

      {pageError ? <Alert variant="error">{pageError}</Alert> : null}
      {notice ? <Alert variant="success">{notice}</Alert> : null}

      <div className={styles.grid}>
        {/* Image */}
        <div>
          <SafeImage
            src={img}
            alt={product.name}
            className={styles.image}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Details */}
        <div>
          <h1 className={styles.title}>{product.name}</h1>

          {cat ? (
            <div className={styles.category}>
              Category{' '}
              {cat.href ? (
                <Link to={cat.href} className={styles.link}>
                  <strong>{cat.label}</strong>
                </Link>
              ) : (
                <strong>{cat.label}</strong>
              )}
            </div>
          ) : null}

          <div className={styles.price}>{price}</div>

          {product.stock != null ? (
            <div className={isOutOfStock ? styles.stockOut : styles.stockOk}>
              {isOutOfStock
                ? 'Out of stock'
                : `In stock: ${product.stock} (available to add: ${remainingToAdd})`}
            </div>
          ) : null}

          {product.description ? <p className={styles.description}>{product.description}</p> : null}

          {notice ? <div className={styles.notice} /> : null}

          {/* Quantity + action */}
          <div className={styles.qtyRow}>
            <span className={styles.qtyLabel}>Qty</span>
            <QuantitySelector
              value={qty}
              min={1}
              max={Math.max(1, remainingToAdd || 1)}
              onChange={setQty}
              disabled={adding || isOutOfStock}
            />
            <Button
              type="button"
              disabled={adding || isOutOfStock}
              onClick={onAddToCart}
            >
              {adding ? 'Adding…' : 'Add to cart'}
            </Button>

            {!isAuth && (
              <Button to="/login" variant="outline" size="sm">
                Log in
              </Button>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
}
