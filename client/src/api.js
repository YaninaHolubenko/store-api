// Centralized API helper using fetch and JWT in localStorage

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

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
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) {}

  if (!res.ok) {
    // Prefer readable messages from backend
    let msg =
      (data && (data.message || data.error)) ||
      (Array.isArray(data?.errors) && data.errors[0]?.msg) || // express-validator
      `HTTP ${res.status}`;
    // Attach status & body for friendlier handling downstream
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
  return fetchJSON(path, { ...options, headers });
}

// ---- Auth endpoints ----
export async function login({ username, password }) {
  // Expect backend to return { token, user? }
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
  // Backend expects JSON body: { productId, quantity } as positive integers
  const pid = Number(productId);
  const qty = Number(quantity);

  if (!Number.isInteger(pid) || pid <= 0) {
    throw new Error(`Bad productId: ${productId}`);
  }
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new Error(`Bad quantity: ${quantity}`);
  }

  // Send exactly what backend contract requires
  return fetchAuth(CART_ADD_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }, // explicit to avoid any overrides
    body: JSON.stringify({ productId: pid, quantity: qty }),
  });
}

export async function getCart() {
  return fetchAuth(CART_GET_PATH, { method: 'GET' });
}

export async function removeCartItem(itemId) {
  // Typical REST: DELETE /cart/items/:id
  return fetchAuth(`${CART_ADD_PATH}/${itemId}`, { method: 'DELETE' });
}

// ---- Profile helpers ----
function b64UrlDecode(str) {
  // Decode base64url (JWT payload)
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

// Try to fetch current user profile; fallback to GET /users/:id decoded from JWT
export async function getCurrentUser() {
  const candidates = ['/me', '/profile', '/users/me', '/auth/me'];
  for (const path of candidates) {
    try {
      const data = await fetchAuth(path, { method: 'GET' });
      const u = data?.user || data;
      if (u && (u.username || u.email || u.id || u.sub)) return u;
    } catch (_) {
      // try next
    }
  }

  const token = getToken();
  if (!token) return null;
  const p = decodeJwt(token);
  const userId = p?.id ?? p?.sub ?? p?.user_id;
  if (!userId) return null;

  try {
    const data = await fetchAuth(`/users/${userId}`, { method: 'GET' });
    return data?.user || data || null;
  } catch {
    return null;
  }
}

// ---- Category endpoints ----
const CATEGORIES_PATH = process.env.REACT_APP_CATEGORIES_PATH || '/categories';

export async function getCategories() {
  // Some APIs return { categories: [...] }, others return an array
  const data = await fetchJSON(CATEGORIES_PATH, { method: 'GET' });
  return Array.isArray(data?.categories) ? data.categories : data;
}