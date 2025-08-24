// Real login form: calls /login, saves JWT, updates auth context, navigates home
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login as apiLogin } from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { setAuthFromLoginResponse } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle input changes
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Submit login form
  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const resp = await apiLogin({
        username: form.username.trim(),
        password: form.password,
      });
      // Wait until context stores token + user
      await setAuthFromLoginResponse(resp);
      // Navigate to home on success
      navigate('/');
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '2rem auto', padding: '1rem' }}>
      <h1 style={{ marginTop: 0 }}>Login</h1>

      {error ? (
        <div
          style={{
            background: '#ffe6e6',
            color: '#a40000',
            padding: '8px 12px',
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      ) : null}

      <form onSubmit={onSubmit}>
        <div style={{ display: 'grid', gap: 12 }}>
          <label>
            <div style={{ marginBottom: 4 }}>Username</div>
            <input
              name="username"
              value={form.username}
              onChange={onChange}
              placeholder="Enter username"
              autoComplete="username"
              required
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 8,
                border: '1px solid #ccc',
              }}
            />
          </label>

          <label>
            <div style={{ marginBottom: 4 }}>Password</div>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              placeholder="Enter password"
              autoComplete="current-password"
              required
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 8,
                border: '1px solid #ccc',
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #222',
              background: loading ? '#444' : '#111',
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>

      <div style={{ marginTop: 12 }}>
        No account? <Link to="/register">Register</Link>
      </div>
    </div>
  );
}
