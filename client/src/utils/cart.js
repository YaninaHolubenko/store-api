// client\src\utils\cart.js

/** Build a stable React key for a cart item */
export function getItemKey(it = {}) {
  return (
    it.id ??
    it.item_id ??
    it.cart_item_id ??
    // fallback: compose from product-related fields
    [it.productId ?? it.product_id ?? it.product?.id ?? 'x', it.name ?? 'item'].join(':')
  );
}

/** Extract numeric quantity from multiple possible item shapes */
export function getQty(it = {}) {
  const q = it.qty ?? it.quantity ?? it.count ?? 1;
  const n = Number(q);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Extract unit price from multiple possible item shapes */
export function getUnitPrice(it = {}) {
  const p =
    it.price ??
    it.unit_price ??
    it.price_at_add ??
    it.product?.price ??
    it.product_price ??
    0;
  const n = Number(p);
  return Number.isFinite(n) ? n : 0;
}
