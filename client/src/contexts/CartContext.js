// client/src/contexts/CartContext.js
// Cart context: keeps items, count, total and actions (refresh/add/remove/update)
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  getCart as apiGetCart,
  addToCart as apiAddToCart,
  removeCartItem as apiRemoveCartItem,
  updateCartItem as apiUpdateCartItem, // must exist in client/src/api.js
} from '../api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

// Normalize cart response from various backend shapes
function normalizeItems(resp) {
  const root = resp?.cart ?? resp;
  const raw = Array.isArray(root) ? root : (root?.items ?? root?.cartItems ?? []);
  if (!Array.isArray(raw)) return [];

  return raw.map((it) => {
    const product = it.product || it.product_info || null;

    // ✅ учитываем разные возможные ключи ID карточки корзины
    const idRaw =
      it.id ??
      it.item_id ??
      it.cart_item_id ??     // <-- главное исправление
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

  // Add product to cart
  async function add(productId, quantity = 1) {
    if (!isAuth) {
      const err = new Error('Please sign in to add items to your cart.');
      err.status = 401;
      throw err;
    }
    await apiAddToCart(Number(productId), Number(quantity));
    await refresh();
  }

  // Remove cart item (optimistic)
  async function remove(itemId) {
    if (!isAuth) {
      const err = new Error('Please sign in to modify your cart.');
      err.status = 401;
      throw err;
    }

    const prev = items; // snapshot for rollback
    setItems((curr) => curr.filter((it) => it.id !== itemId));

    try {
      await apiRemoveCartItem(itemId);
    } catch (e) {
      setItems(prev); // rollback on failure
      throw e;
    }
  }

  // Update quantity (optimistic)
  async function update(itemId, quantity) {
    if (!isAuth) {
      const err = new Error('Please sign in to modify your cart.');
      err.status = 401;
      throw err;
    }

    const q = Math.max(1, Number(quantity) || 1); // ensure positive integer

    const prev = items; // snapshot for rollback
    setItems((curr) =>
      curr.map((it) =>
        it.id === itemId ? { ...it, quantity: q, lineTotal: Number(it.price) * q } : it
      )
    );

    try {
      // передаём число; apiUpdateCartItem завернёт его в { quantity: q }
      await apiUpdateCartItem(itemId, q);
    } catch (e) {
      setItems(prev); // rollback on failure
      throw e;
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
    add,
    remove,
    update,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
