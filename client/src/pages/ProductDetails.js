// Product details page: fetch by ID and render a simple layout + real Add to cart with quantity
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export default function ProductDetails() {
  const { id } = useParams();
  const { add } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState('');
  const [qty, setQty] = useState(1); // quantity selector

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/products/${id}`, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const p = data?.product || data;
        setProduct(p);
        setQty(1); // reset quantity when product changes
      } catch (e) {
        setError(e?.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // Map technical errors to friendly messages
  function friendlyCartError(err) {
    const msg = String(err?.message || '');
    if (err?.status === 401 || /token/i.test(msg) || /unauth/i.test(msg) || /forbidden/i.test(msg)) {
      return 'Please sign in to add items to your cart.';
    }
    if (/HTTP\s+\d+/.test(msg)) return 'Could not add to cart. Please try again.';
    return msg || 'Could not add to cart. Please try again.';
  }

  const onAddToCart = async () => {
    if (!product?.id && !product?.product_id) return;

    setError('');
    setNotice('');
    setAdding(true);
    try {
      // ensure integers
      const pid = Number(product.id ?? product.product_id);
      const q   = Math.max(1, Math.min(Number(qty) || 1, Number(product?.stock ?? 99)));
      await add(pid, q); // CartContext -> api.addToCart({ productId: pid, quantity: q })
      setNotice('Added to cart ✓');
    } catch (e) {
      setError(friendlyCartError(e));
    } finally {
      setAdding(false);
      setTimeout(() => setNotice(''), 2000);
    }
  };

  // Quantity controls
  const decQty = () => setQty((v) => Math.max(1, Number(v || 1) - 1));
  const incQty = () => setQty((v) => {
    const max = Number(product?.stock ?? 99);
    return Math.min(max, Number(v || 1) + 1);
  });
  const onQtyChange = (e) => {
    const v = Math.floor(Number(e.target.value) || 1);
    const max = Number(product?.stock ?? 99);
    setQty(Math.max(1, Math.min(max, v)));
  };

  if (loading) return <div style={{ padding: '1rem' }}>Loading…</div>;
  if (error && !product) return <div style={{ padding: '1rem', color: 'crimson' }}>Error: {error}</div>;
  if (!product) return <div style={{ padding: '1rem' }}>Product not found.</div>;

  const img = product.image_url || product.imageUrl || product.image || '';
  const price = typeof product.price !== 'undefined' ? Number(product.price).toFixed(2) : '';

  // Derive category link (name if you synced names, otherwise falls back to id)
  const categoryId = product.category_id ?? product.categoryId ?? null;
  const categoryName = product.category ?? product.category_name ?? null;
  const catLabel = categoryName ? (categoryName[0].toUpperCase() + categoryName.slice(1)) :
                   (categoryId != null ? `Category #${categoryId}` : null);
  const catHref = categoryName
    ? `/?categoryName=${encodeURIComponent(categoryName)}`
    : (categoryId != null ? `/?category=${Number(categoryId)}` : null);

  return (
    <div style={{ padding: '1rem', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/">← Back to products</Link>
      </div>

      {error ? (
        <div style={{ background: '#ffe6e6', color: '#a40000', padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>
          {error}
        </div>
      ) : null}
      {notice ? (
        <div style={{ background: '#e8fff1', color: '#035e2b', padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>
          {notice}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          {img ? (
            <img
              src={img}
              alt={product.name}
              style={{ width: '100%', height: 360, objectFit: 'cover', borderRadius: 8 }}
              onError={(e) => { e.currentTarget.src = 'https://placehold.co/800x600?text=No+Image'; }}
            />
          ) : (
            <div style={{ width: '100%', height: 360, display: 'grid', placeItems: 'center', background: '#f7f7f7', borderRadius: 8, color: '#777' }}>
              No image
            </div>
          )}
        </div>

        <div>
          <h1 style={{ marginTop: 0 }}>{product.name}</h1>

          {catLabel ? (
            <div style={{ marginBottom: 6 }}>
              <span style={{ opacity: 0.7 }}>Category:</span>{' '}
              {catHref ? (
                <Link to={catHref} style={{ textDecoration: 'none' }}>{catLabel}</Link>
              ) : (
                <span>{catLabel}</span>
              )}
            </div>
          ) : null}

          <div style={{ fontSize: 18, opacity: 0.85, whiteSpace: 'pre-wrap' }}>{product.description || 'No description'}</div>
          <div style={{ marginTop: 16, fontSize: 22, fontWeight: 700 }}>{price ? `£${price}` : ''}</div>
          {typeof product.stock !== 'undefined' ? (
            <div style={{ marginTop: 8, color: product.stock > 0 ? 'green' : 'crimson' }}>
              {product.stock > 0 ? `In stock: ${product.stock}` : 'Out of stock'}
            </div>
          ) : null}

          {/* Quantity selector */}
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={decQty} disabled={adding || qty <= 1} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #222', background: '#fff' }}>−</button>
            <input
              type="number"
              min={1}
              max={product?.stock ?? 99}
              value={qty}
              onChange={onQtyChange}
              style={{ width: 70, textAlign: 'center', padding: '8px', borderRadius: 8, border: '1px solid #ccc' }}
            />
            <button type="button" onClick={incQty} disabled={adding || (product?.stock && qty >= product.stock)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #222', background: '#fff' }}>+</button>
          </div>

          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              disabled={adding || product.stock <= 0}
              onClick={onAddToCart}
              style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #222', background: adding ? '#444' : '#111', color: '#fff', cursor: adding || product.stock <= 0 ? 'not-allowed' : 'pointer' }}
            >
              {adding ? 'Adding…' : 'Add to cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
