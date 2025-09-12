// client/src/pages/OAuthCallback.js
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function OAuthCallback() {
  const { setAuthFromLoginResponse } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // No need to parse query params; server sets the session cookie
    (async () => {
      try {
        // This will trigger AuthContext to load user from /auth/session
        await setAuthFromLoginResponse({});
      } finally {
        // Redirect to home regardless of outcome
        navigate('/', { replace: true });
      }
    })();
  }, [setAuthFromLoginResponse, navigate]);

  return <div style={{ padding: '1rem' }}>Signing you in…</div>;
}
