import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function OAuthCallback() {
  const { setAuthFromLoginResponse } = useAuth();
  const navigate = useNavigate();
  const { search } = useLocation();

  useEffect(() => {
    const sp = new URLSearchParams(search);
    const token = sp.get('token');
    const email = sp.get('email') || '';
    const name = sp.get('name') || (email ? email.split('@')[0] : 'user');

    if (token) {
      setAuthFromLoginResponse({
        token,
        user: { username: name, email },
      });
      navigate('/', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [search, setAuthFromLoginResponse, navigate]);

  return <div style={{ padding: '1rem' }}>Signing you in…</div>;
}
