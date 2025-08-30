// Centralized API helper using fetch and JWT in localStorage

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const DEFAULT_CREDENTIALS = 'include'; // send session cookie (for Google OAuth)

// ---- Token helpers ----
export function getToken() {
  return localStorage.getItem('token');
}
export function setToken(token) {
  localStorage.setItem('token', token);
}
export function clearToken() {
  localStorage.removeItem('token');
}

// ---- Base request helpers ----
export async function fetchJSON(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    // keep headers first so caller can override if needed
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {}),
    },
    // ensure session cookie is sent; safe for JWT too
    credentials: options.credentials || DEFAULT_CREDENTIALS,
    ...options,
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) {}

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      (Array.isArray(data?.errors) && data.errors[0]?.msg) || // express-validator
      `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export async function fetchAuth(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetchJSON(path, {
    ...options,
    headers,
    credentials: options.credentials || DEFAULT_CREDENTIALS,
  });
}

// ---- Auth endpoints ----
export async function login({ username, password }) {
  // Returns { token, user? } for local login
  const data = await fetchJSON('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (data?.token) setToken(data.token);
  return data;
}

export async function register({ username, email, password }) {
  const data = await fetchJSON('/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
  if (data?.token) setToken(data.token);
  return data;
}

export function logout() {
  clearToken();
}

// ---- Product endpoints ----
export async function getProducts() {
  return fetchJSON('/products');
}
export async function getProduct(id) {
  return fetchJSON(`/products/${id}`);
}

// ---- Cart endpoints ----
const CART_ADD_PATH = process.env.REACT_APP_CART_ADD_PATH || '/cart/items';
const CART_GET_PATH  = process.env.REACT_APP_CART_GET_PATH  || '/cart';

export async function addToCart(productId, quantity = 1) {
  const pid = Number(productId);
  const qty = Number(quantity);

  if (!Number.isInteger(pid) || pid <= 0) {
    throw new Error(`Bad productId: ${productId}`);
  }
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new Error(`Bad quantity: ${quantity}`);
  }

  return fetchAuth(CART_ADD_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: pid, quantity: qty }),
  });
}

export async function getCart() {
  return fetchAuth(CART_GET_PATH, { method: 'GET' });
}

export async function removeCartItem(itemId) {
  return fetchAuth(`${CART_ADD_PATH}/${itemId}`, { method: 'DELETE' });
}

// ---- Profile helpers ----
function b64UrlDecode(str) {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4;
  if (pad) s += '='.repeat(4 - pad);
  return atob(s);
}
function decodeJwt(token) {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    return JSON.parse(b64UrlDecode(payload));
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  // 1) Try Google OAuth session (cookie-based)
  try {
    const s = await fetchJSON('/auth/session', { method: 'GET' });
    if (s?.authenticated && s.user) return s.user;
  } catch (_) {
    // ignore
  }

  // 2) Fallback to JWT (local login)
  const token = getToken();
  if (!token) return null;
  const p = decodeJwt(token);
  const userId = p?.id ?? p?.sub ?? p?.user_id;
  if (!userId) return null;

  // Try to fetch a fresh copy; if endpoint is missing, fall back to token data
  try {
    const data = await fetchAuth(`/users/${userId}`, { method: 'GET' });
    return data?.user || data || { id: userId, username: p?.username ?? p?.name ?? null, email: p?.email ?? null };
  } catch {
    return { id: userId, username: p?.username ?? p?.name ?? null, email: p?.email ?? null };
  }
}

// ---- Category endpoints ----
const CATEGORIES_PATH = process.env.REACT_APP_CATEGORIES_PATH || '/categories';

export async function getCategories() {
  const data = await fetchJSON(CATEGORIES_PATH, { method: 'GET' });
  return Array.isArray(data?.categories) ? data.categories : data;
}
