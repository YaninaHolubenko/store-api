// Register page: create account, store JWT, update auth context, navigate home
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register as apiRegister } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Container from '../components/Container';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';

export default function Register() {
  const navigate = useNavigate();
  const { setAuthFromLoginResponse } = useAuth();

  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Keep form state in sync
  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // Submit registration form
  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const resp = await apiRegister({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      await setAuthFromLoginResponse(resp);
      navigate('/');
    } catch (err) {
      setError(err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  // Consistent sizing for inputs and button (44px)
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

  return (
    <Container>
      {/* narrow column for the form */}
      <div style={{ maxWidth: 420, margin: '2rem auto 0', width: '100%' }}>
        <h1 style={{ marginTop: 0, marginBottom: 12 }}>Register</h1>

        {error ? <Alert variant="error">{error}</Alert> : null}

        <form onSubmit={onSubmit} noValidate>
          <div style={{ display: 'grid', gap: 12 }}>
            {/* Username */}
            <label htmlFor="reg-username">
              <div style={{ marginBottom: 4 }}>Username</div>
              <input
                id="reg-username"
                name="username"
                value={form.username}
                onChange={onChange}
                placeholder="Choose a username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                required
                style={inputStyle}
              />
            </label>

            {/* Email */}
            <label htmlFor="reg-email">
              <div style={{ marginBottom: 4 }}>Email</div>
              <input
                id="reg-email"
                name="email"
                type="email"
                value={form.email}
                onChange={onChange}
                placeholder="you@example.com"
                autoComplete="email"
                required
                style={inputStyle}
              />
            </label>

            {/* Password */}
            <label htmlFor="reg-password">
              <div style={{ marginBottom: 4 }}>Password</div>
              <input
                id="reg-password"
                name="password"
                type="password"
                value={form.password}
                onChange={onChange}
                placeholder="Create a password"
                autoComplete="new-password"
                required
                style={inputStyle}
              />
            </label>

            {/* Submit button: full width, same height as inputs */}
            <Button type="submit" disabled={loading} style={{ width: '100%', height: 44 }}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </div>
        </form>

        <div style={{ marginTop: 12 }}>
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </Container>
  );
}
