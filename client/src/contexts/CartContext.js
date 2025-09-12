// client/src/contexts/CartContext.js
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  getCart as apiGetCart,
  addToCart as apiAddToCart,
  removeCartItem as apiRemoveCartItem,
  updateCartItem as apiUpdateCartItem, 
} from '../api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

// ---- helpers ----
function normalizeItems(resp) {
  const root = resp?.cart ?? resp;
  const raw = Array.isArray(root) ? root : (root?.items ?? root?.cartItems ?? []);
  if (!Array.isArray(raw)) return [];

  return raw.map((it) => {
    const product = it.product || it.product_info || null;

    const idRaw =
      it.id ??
      it.item_id ??
      it.cart_item_id ??     
      it.cartItemId ??
      null;

    const id = idRaw != null ? Number(idRaw) : null;

    const productId =
      it.product_id ??
      it.productId ??
      product?.id ??
      null;

    const name =
      it.name ??
      product?.name ??
      (productId ? `Product #${productId}` : 'Product');

    const image =
      it.image_url ??
      product?.image_url ??
      product?.image ??
      null;

    const qty = Number(it.quantity ?? it.qty ?? 1);
    const unitPrice = Number(it.price ?? product?.price ?? 0);
    const lineTotal = unitPrice * qty;

    return {
      id,
      productId: productId != null ? Number(productId) : null,
      name,
      image,
      quantity: qty,
      price: unitPrice,
      lineTotal,
      raw: it,
    };
  });
}

function formatStockError(err) {
  const d = err?.body?.details || err?.details || null;
  if (err?.status === 409 && (err?.message?.toLowerCase?.().includes('insufficient') || err?.body?.error === 'Insufficient stock')) {
    const name = d?.productName || (d?.productId ? `Product #${d.productId}` : 'This item');
    const available = d?.available != null ? Number(d.available) : null;
    if (available != null) {
      return `${name}: only ${available} in stock.`;
    }
    return 'Insufficient stock for this item.';
  }

  if (err?.status === 400) return err.message || 'Invalid request.';
 
  if (err?.status === 401 || err?.status === 403) return 'Please sign in to modify your cart.';

  return err?.message || 'Cart action failed.';
}

export function CartProvider({ children }) {
  const { isAuth } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authRequired, setAuthRequired] = useState(false);

  // Load/refresh cart from server
  async function refresh() {
    setError('');
    setLoading(true);

    if (!isAuth) {
      setItems([]);
      setAuthRequired(true);
      setLoading(false);
      setError('Please sign in to view your cart.');
      return;
    }

    try {
      const data = await apiGetCart();
      setItems(normalizeItems(data));
      setAuthRequired(false);
    } catch (e) {
      setItems([]);
      if (e?.status === 401 || e?.status === 403) {
        setAuthRequired(true);
        setError('Please sign in to view your cart.');
      } else {
        setAuthRequired(false);
        setError(String(e?.message || 'Failed to load cart'));
      }
    } finally {
      setLoading(false);
    }
  }

  // Clear cart locally (used right after successful checkout)
  function clear() {
    setItems([]);
    setError('');
    setAuthRequired(false);
  }

  // Add product to cart
  async function add(productId, quantity = 1) {
    if (!isAuth) {
      setError('Please sign in to add items to your cart.');
      const err = new Error('Please sign in to add items to your cart.');
      err.status = 401;
      return false;
    }
    try {
      await apiAddToCart(Number(productId), Number(quantity));
      await refresh();
      return true;
    } catch (e) {
      setError(formatStockError(e));
      return false;
    }
  }

  // Remove cart item (optimistic)
  async function remove(itemId) {
    if (!isAuth) {
      setError('Please sign in to modify your cart.');
      const err = new Error('Please sign in to modify your cart.');
      err.status = 401;
      return false;
    }

    const prev = items; 
    setItems((curr) => curr.filter((it) => it.id !== itemId));

    try {
      await apiRemoveCartItem(itemId);
      return true;
    } catch (e) {
      setItems(prev); 
      setError(e?.message || 'Failed to remove item.');
      return false;
    }
  }

  // Update quantity (optimistic)
  async function update(itemId, quantity) {
    if (!isAuth) {
      setError('Please sign in to modify your cart.');
      const err = new Error('Please sign in to modify your cart.');
      err.status = 401;
      return false;
    }

    const q = Math.max(1, Number(quantity) || 1); 

    const prev = items; 
    setItems((curr) =>
      curr.map((it) =>
        it.id === itemId ? { ...it, quantity: q, lineTotal: Number(it.price) * q } : it
      )
    );

    try {
      // apiUpdateCartItem should post { quantity: q }
      await apiUpdateCartItem(itemId, q);
      return true;
    } catch (e) {
      setItems(prev); 
      setError(formatStockError(e));
      return false;
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth]);

  const count = useMemo(() => items.reduce((s, it) => s + (it.quantity || 0), 0), [items]);
  const total = useMemo(() => items.reduce((s, it) => s + (it.lineTotal || 0), 0), [items]);

  const value = {
    items,
    count,
    total,
    loading,
    error,
    authRequired,
    refresh,
    clear,
    add,
    remove,
    update,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
