// Real login form: calls /login, saves JWT, updates auth context, navigates home
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login as apiLogin } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Container from '../components/Container';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import FormInput from '../components/ui/FormInput';
import styles from './Login.module.css';

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
              inputProps={{
                autoCapitalize: 'none',
                autoCorrect: 'off',
              }}
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
              required
            />

            {/* Submit button: full width and same height as inputs */}
            <Button type="submit" disabled={loading} className={styles.fullButton}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </div>
        </form>

        <div className={styles.registerRow}>
          No account? <Link to="/register">Register</Link>
        </div>
      </div>
    </Container>
  );
}
