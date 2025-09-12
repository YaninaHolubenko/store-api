// client/src/pages/Register.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register as apiRegister } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Container from '../components/Container';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import FormInput from '../components/ui/FormInput';
import OAuthButtons from '../components/ui/OAuthButtons';
import styles from './Register.module.css';

// Tiny email validator (client-side convenience)
function isEmail(v) {
  // Simple RFC 5322-ish; good enough for client-side hint
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
}

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

    // --- Client-side validation (fast feedback) ---
    const uname = form.username.trim();
    const email = form.email.trim();
    const pwd = form.password;

    if (uname.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (!isEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (pwd.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    // ---------------------------------------------

    setLoading(true);
    try {
      const resp = await apiRegister({
        username: uname,
        email,
        password: pwd, // hashing is handled on the server (bcrypt)
      });
      await setAuthFromLoginResponse(resp);
      navigate('/');
    } catch (err) {
      setError(err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container>
      {/* Narrow column for the form */}
      <div className={styles.container}>
        <h1 className={styles.title}>Register</h1>

        {error ? <Alert variant="error">{error}</Alert> : null}

        <form onSubmit={onSubmit} noValidate aria-busy={loading ? 'true' : 'false'}>
          <div className={styles.formGrid}>
            {/* Username */}
            <FormInput
              label="Username"
              id="reg-username"
              name="username"
              value={form.username}
              onChange={onChange}
              placeholder="Choose a username"
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

            {/* Email */}
            <FormInput
              label="Email"
              id="reg-email"
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              placeholder="you@example.com"
              autoComplete="email"
              blockClassName={styles.labelBlock}
              labelClassName={styles.labelText}
              inputClassName={styles.input}
              required
            />

            {/* Password */}
            <FormInput
              label="Password"
              id="reg-password"
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              placeholder="Create a password"
              autoComplete="new-password"
              blockClassName={styles.labelBlock}
              labelClassName={styles.labelText}
              inputClassName={styles.input}
              required
            />

            {/* Submit button: full width, same height as inputs */}
            <Button
              type="submit"
              disabled={loading}
              aria-disabled={loading ? 'true' : undefined}
              className={styles.fullButton}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </div>
        </form>

        {/* Divider + OAuth */}
        <div className={styles.orRow} role="separator" aria-label="Or continue with" />
        <OAuthButtons />

        <div className={styles.loginRow}>
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </Container>
  );
}
