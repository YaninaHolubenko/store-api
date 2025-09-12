// client\src\utils\categories.js
import { toTitle } from './format';

/**
 * Resolve category label and link for a product.
 * Returns { label, href } or null if nothing can be resolved.
 */
export function resolveCategoryMeta(product, categories = []) {
  if (!product) return null;

  const categoryId = product.categoryId ?? null;
  let resolvedName = product.categoryName ?? null;

  // If product has no categoryName, try to find it by id in the categories list
  if (!resolvedName && categoryId != null && categories.length) {
    const found = categories.find(
      (c) => Number(c.id ?? c.category_id) === Number(categoryId)
    );
    const rawName =
      found?.display_name || found?.name || found?.slug || found?.title || null;
    if (rawName) resolvedName = String(rawName);
  }

  // Build label and href
  if (resolvedName) {
    return {
      label: toTitle(resolvedName),
      href: `/?categoryName=${encodeURIComponent(resolvedName)}`,
    };
  }

  if (categoryId != null) {
    return {
      label: `Category #${Number(categoryId)}`,
      href: `/?category=${Number(categoryId)}`,
    };
  }

  return null;
}
