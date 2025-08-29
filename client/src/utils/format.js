// Small text/regex helpers

/** Title-case the first character of a string */
export function toTitle(s) {
  if (!s) return '';
  const str = String(s);
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Escape string for use inside a new RegExp */
export function escapeReg(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
