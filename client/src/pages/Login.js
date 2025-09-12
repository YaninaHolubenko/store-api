// client\src\pages\Login.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login as apiLogin } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Container from '../components/Container';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import FormInput from '../components/ui/FormInput';
import OAuthButtons from '../components/ui/OAuthButtons';
import styles from './Login.module.css';

// Map backend/transport errors to user-friendly messages (client-only)
function normalizeLoginError(err) {
  const status = err?.status;
  const body = err?.body;
  const rawMsg = String(body?.error || err?.message || '').toLowerCase();

  // express-rate-limit
  if (status === 429) return 'Too many login attempts. Please try again in a minute.';
  // invalid credentials
  if (status === 401 || status === 403) return 'Invalid username or password.';
  // express-validator style { errors: [{ msg }] }
  if (status === 400 && Array.isArray(body?.errors) && body.errors.length) {
    return body.errors.map((e) => e.msg).join(', ');
  }
  if (/missing credentials/.test(rawMsg)) return 'Invalid username or password.';

  return 'Could not sign in. Please try again.';
}

export default function Login() {
  const navigate = useNavigate();
  const { setAuthFromLoginResponse } = useAuth();

  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Keep form state in sync
  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // Submit login form
  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    // Quick client-side checks (same spirit as Register)
    const uname = form.username.trim();
    const pwd = form.password;

    if (!uname) {
      setError('Please enter your username.');
      return;
    }
    if (!pwd) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const resp = await apiLogin({ username: uname, password: pwd });
      await setAuthFromLoginResponse(resp);
      navigate('/');
    } catch (err) {
      setError(normalizeLoginError(err));
    } finally {
      setLoading(false);
    }
  }

  // Layout
  return (
    <Container>
      {/* Narrow column for the form */}
      <div className={styles.container}>
        <h1 className={styles.title}>Login</h1>

        {error ? <Alert variant="error">{error}</Alert> : null}

        <form onSubmit={onSubmit} noValidate>
          <div className={styles.formGrid}>
            {/* Username */}
            <FormInput
              label="Username"
              id="login-username"
              name="username"
              value={form.username}
              onChange={onChange}
              placeholder="Enter username"
              autoComplete="username"
              blockClassName={styles.labelBlock}
              labelClassName={styles.labelText}
              inputClassName={styles.input}
              inputProps={{ autoCapitalize: 'none', autoCorrect: 'off' }}
              required
            />

            {/* Password */}
            <FormInput
              label="Password"
              id="login-password"
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              placeholder="Enter password"
              autoComplete="current-password"
              blockClassName={styles.labelBlock}
              labelClassName={styles.labelText}
              inputClassName={styles.input}
              showPasswordToggle
              required
            />

            <Button type="submit" disabled={loading} className={styles.fullButton}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </div>
        </form>

        <div className={styles.oauthRow}>
          <OAuthButtons />
        </div>

        <div className={styles.registerRow}>
          No account? <Link to="/register">Register</Link>
        </div>
      </div>
    </Container>
  );
}
