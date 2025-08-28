// Real login form: calls /login, saves JWT, updates auth context, navigates home
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login as apiLogin } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Container from '../components/Container';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';

export default function Login() {
  const navigate = useNavigate();
  const { setAuthFromLoginResponse } = useAuth();

  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- handlers ---
  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const resp = await apiLogin({
        username: form.username.trim(),
        password: form.password,
      });
      await setAuthFromLoginResponse(resp);
      navigate('/');
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  // --- consistent field + button sizing ---
  // Keep 44px height to match button and avoid iOS zoom (fontSize >= 16px)
  const inputStyle = {
    width: '100%',
    height: 44,
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #ccc',
    boxSizing: 'border-box',
    fontSize: 16,
    outline: 'none',
  };

  // --- layout ---
  return (
    <Container>
      {/* narrow column for the form */}
      <div style={{ maxWidth: 420, margin: '2rem auto 0', width: '100%' }}>
        <h1 style={{ marginTop: 0, marginBottom: 12 }}>Login</h1>

        {error ? <Alert variant="error">{error}</Alert> : null}

        <form onSubmit={onSubmit} noValidate>
          <div style={{ display: 'grid', gap: 12 }}>
            {/* Username */}
            <label htmlFor="login-username">
              <div style={{ marginBottom: 4 }}>Username</div>
              <input
                id="login-username"
                name="username"
                value={form.username}
                onChange={onChange}
                placeholder="Enter username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                required
                style={inputStyle}
              />
            </label>

            {/* Password */}
            <label htmlFor="login-password">
              <div style={{ marginBottom: 4 }}>Password</div>
              <input
                id="login-password"
                name="password"
                type="password"
                value={form.password}
                onChange={onChange}
                placeholder="Enter password"
                autoComplete="current-password"
                required
                style={inputStyle}
              />
            </label>

            {/* Submit button: full width and same height as inputs */}
            <Button
              type="submit"
              disabled={loading}
              style={{ width: '100%', height: 44 }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </div>
        </form>

        <div style={{ marginTop: 12 }}>
          No account? <Link to="/register">Register</Link>
        </div>
      </div>
    </Container>
  );
}
