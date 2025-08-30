// Simple auth context: supports both JWT and server sessions (OAuth)
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getToken, setToken as saveToken, clearToken, getCurrentUser } from '../api';

const AuthContext = createContext(null);
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function normalizeUser(src) {
  return {
    id: src?.id ?? src?.user_id ?? src?.sub ?? null,
    username: src?.username ?? src?.name ?? null,
    email: src?.email ?? null,
  };
}

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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  async function loadSessionUser() {
    try {
      const res = await fetch(`${API_URL}/auth/session`, {
        credentials: 'include',
      });
      const data = await res.json().catch(() => null);
      if (data?.authenticated && data?.user) {
        const u = normalizeUser(data.user);
        setUser(u);
        localStorage.setItem('user', JSON.stringify(u));
        return true;
      }
    } catch {}
    return false;
  }

  useEffect(() => {
    (async () => {
      // 1) Try server session (OAuth)
      const ok = await loadSessionUser();
      if (ok) return;

      // 2) Fallback to JWT flow
      const token = getToken();
      if (!token) return;

      const saved = localStorage.getItem('user');
      if (saved) {
        try {
          setUser(JSON.parse(saved));
          return;
        } catch {}
      }

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

  async function setAuthFromLoginResponse(resp) {
    if (resp?.token) saveToken(resp.token);

    let u = resp?.user ? normalizeUser(resp.user) : null;
    if (!u) {
      const me = await getCurrentUser().catch(() => null);
      if (me) u = normalizeUser(me);
    }
    if (!u && resp?.token) {
      const p = decodeJwt(resp.token);
      if (p) u = normalizeUser(p);
    }

    setUser(u);
    if (u) localStorage.setItem('user', JSON.stringify(u));
  }

  async function logout() {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {}
    clearToken();
    localStorage.removeItem('user');
    setUser(null);
  }

  const value = {
    user,
    isAuth: !!user,
    setAuthFromLoginResponse,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
