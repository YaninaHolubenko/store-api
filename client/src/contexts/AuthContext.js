// Simple auth context: keeps user + token (from localStorage)
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getToken, setToken as saveToken, clearToken, getCurrentUser } from '../api';

const AuthContext = createContext(null);

// Normalize various user payload shapes to a common shape
function normalizeUser(src) {
  return {
    id: src?.id ?? src?.user_id ?? src?.sub ?? null,
    username: src?.username ?? src?.name ?? null,
    email: src?.email ?? null,
  };
}

function b64UrlDecode(str) {
  // Decode base64url (JWT payload)
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4;
  if (pad) s += '='.repeat(4 - pad);
  return atob(s);
}

function decodeJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const json = b64UrlDecode(parts[1]);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Bootstrap from localStorage on first load
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // Prefer saved user from localStorage
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
        return;
      } catch {
        // ignore parse error
      }
    }

    // Try to fetch profile; if not available, fall back to decoding JWT
    (async () => {
      const me = await getCurrentUser().catch(() => null);
      if (me) {
        const u = normalizeUser(me);
        setUser(u);
        localStorage.setItem('user', JSON.stringify(u));
        return;
      }
      const p = decodeJwt(token);
      if (p) {
        const u = normalizeUser(p);
        setUser(u);
        localStorage.setItem('user', JSON.stringify(u));
      }
    })();
  }, []);

  // Call this right after successful /login or /register
  async function setAuthFromLoginResponse(resp) {
    if (resp?.token) saveToken(resp.token);

    // Prefer explicit user from response
    let u = resp?.user ? normalizeUser(resp.user) : null;

    // If not provided, try to fetch profile endpoint
    if (!u) {
      const me = await getCurrentUser().catch(() => null);
      if (me) u = normalizeUser(me);
    }

    // Final fallback: decode JWT payload
    if (!u && resp?.token) {
      const p = decodeJwt(resp.token);
      if (p) u = normalizeUser(p);
    }

    setUser(u);
    if (u) localStorage.setItem('user', JSON.stringify(u));
  }

  function logout() {
    clearToken();
    localStorage.removeItem('user');
    setUser(null);
  }

  const value = {
    user,
    isAuth: !!getToken(), // derived from localStorage token
    setAuthFromLoginResponse,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
