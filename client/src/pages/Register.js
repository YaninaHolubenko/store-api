// Register page: create account, store JWT, update auth context, navigate home
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register as apiRegister } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Container from '../components/Container';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import FormInput from '../components/ui/FormInput';
import styles from './Register.module.css';

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

  return (
    <Container>
      {/* Narrow column for the form */}
      <div className={styles.container}>
        <h1 className={styles.title}>Register</h1>

        {error ? <Alert variant="error">{error}</Alert> : null}

        <form onSubmit={onSubmit} noValidate>
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
            <Button type="submit" disabled={loading} className={styles.fullButton}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </div>
        </form>

        <div className={styles.loginRow}>
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </Container>
  );
}
