// Data normalizers for API responses with varying shapes
import { toTitle } from './format';

/** Normalize products list from various API shapes into a stable shape */
export function normalizeProducts(raw) {
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

/** Normalize categories list from various API shapes into a stable shape */
export function normalizeCategories(raw) {
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

/** Normalize a single product object from various API shapes into a stable shape */
export function normalizeProduct(src) {
  if (!src) return null;
  const p = src.product ?? src;
  return {
    id: Number(p.id ?? p.product_id ?? p._id),
    name: p.name ?? p.title ?? 'Product',
    description: p.description ?? '',
    price: typeof p.price !== 'undefined' ? Number(p.price) : null,
    image: p.image_url ?? p.imageUrl ?? p.image ?? '',
    stock: p.stock != null ? Number(p.stock) : null,
    categoryId: p.category_id ?? p.categoryId ?? null,
    categoryName: p.category ?? p.category_name ?? null,
  };
}