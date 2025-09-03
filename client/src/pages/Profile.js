// client/src/pages/Profile.jsx
// Profile page with aligned success/error banner to the card width via a shared frame.
import React, { useEffect, useState } from 'react';
import Container from '../components/Container';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import FormInput from '../components/ui/FormInput';
import { getToken as apiGetToken } from '../api';
import styles from './Profile.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export default function Profile() {
  // Profile fields
  const [form, setForm] = useState({ username: '', email: '' });
  const [initialForm, setInitialForm] = useState({ username: '', email: '' });

  // Password change fields
  const [hasPassword, setHasPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  // UI state
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState('');
  const [globalOk, setGlobalOk] = useState('');

  // Per-field edit/saving/error state
  const [edit, setEdit] = useState({ username: false, email: false });
  const [savingField, setSavingField] = useState(null);
  const [errors, setErrors] = useState({ username: '', email: '', password: '' });

  const helpers = {
    username: 'Use 3–30 English letters, numbers or underscore.',
    email: 'We will use this email for order notifications.',
    passwordTip: 'Use at least 8 characters with a mix of letters and numbers.',
  };

  // Build Authorization header (JWT) while keeping session cookie
  function buildAuthHeaders(base = {}) {
    const token =
      (typeof apiGetToken === 'function' && apiGetToken()) ||
      (typeof window !== 'undefined' && window.localStorage
        ? localStorage.getItem('token')
        : null);
    const headers = { ...base };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  // Load current profile
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/users`, {
          credentials: 'include',
          headers: buildAuthHeaders(),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const msg =
            data?.errors?.[0]?.msg ||
            data?.error ||
            (res.status === 401 ? 'You are not logged in.' : 'Failed to load profile.');
          throw new Error(msg);
        }
        if (!isMounted) return;
        const next = {
          username: data?.user?.username || '',
          email: data?.user?.email || '',
        };
        setForm(next);
        setInitialForm(next);
        setHasPassword(Boolean(data?.user?.hasPassword));
      } catch (e) {
        if (!isMounted) return;
        setGlobalError(e?.message || 'Failed to load profile.');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle input changes
  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setGlobalOk('');
    setGlobalError('');
  }

  // Edit toggles
  function toggleEdit(field, next) {
    setEdit((prev) => ({ ...prev, [field]: typeof next === 'boolean' ? next : !prev[field] }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    setGlobalOk('');
    setGlobalError('');
  }
  function cancelField(field) {
    setForm((prev) => ({ ...prev, [field]: initialForm[field] }));
    toggleEdit(field, false);
  }

  // Client-side validation
  function validateField(field, value) {
    if (field === 'username') {
      if (!value || value.length < 3 || value.length > 30) return 'Username must be 3–30 characters.';
      if (!/^[A-Za-z0-9_]+$/.test(value)) return 'Only letters, numbers, and underscore are allowed.';
    }
    if (field === 'email') {
      if (!value || !/^\S+@\S+\.\S+$/.test(value)) return 'Please enter a valid email address.';
    }
    return '';
  }

  // Save profile field
  async function saveField(field) {
    const value = form[field];
    const err = validateField(field, value);
    if (err) {
      setErrors((prev) => ({ ...prev, [field]: err }));
      return;
    }
    setSavingField(field);
    setGlobalError('');
    setGlobalOk('');
    try {
      const payload = { [field]: value };
      const res = await fetch(`${API_URL}/users`, {
        method: 'PATCH',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const vErr = data?.errors?.[0]?.msg || data?.error || 'Could not save changes.';
        throw new Error(vErr);
      }
      setInitialForm((prev) => ({ ...prev, [field]: value }));
      toggleEdit(field, false);
      setGlobalOk('Profile updated.');
    } catch (e) {
      setErrors((prev) => ({ ...prev, [field]: e?.message || 'Could not save changes.' }));
    } finally {
      setSavingField(null);
    }
  }

  // Save password
  async function savePassword() {
    if (!newPassword) {
      setErrors((prev) => ({ ...prev, password: 'Please enter a new password.' }));
      return;
    }
    if (newPassword.length < 8) {
      setErrors((prev) => ({ ...prev, password: 'Password must be at least 8 characters.' }));
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setErrors((prev) => ({ ...prev, password: 'New passwords do not match.' }));
      return;
    }
    if (hasPassword && !currentPassword) {
      setErrors((prev) => ({ ...prev, password: 'Please enter your current password.' }));
      return;
    }

    setSavingField('password');
    setGlobalError('');
    setGlobalOk('');
    setErrors((prev) => ({ ...prev, password: '' }));

    try {
      const payload = {
        newPassword,
        newPasswordConfirm,
        ...(hasPassword ? { currentPassword } : {}),
      };
      const res = await fetch(`${API_URL}/users`, {
        method: 'PATCH',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const vErr = data?.errors?.[0]?.msg || data?.error || 'Could not update password.';
        throw new Error(vErr);
      }
      setGlobalOk('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
    } catch (e) {
      setErrors((prev) => ({ ...prev, password: e?.message || 'Could not update password.' }));
    } finally {
      setSavingField(null);
    }
  }

  if (loading) return <div style={{ padding: '1rem' }}>Loading…</div>;

  return (
    <Container>
      <div className={styles.shell}>
        <h1 className={styles.h1}>My Profile</h1>

        {/* shared frame so notice and card have the exact same outer width */}
        <div className={styles.frame}>
          {globalError && (
            <div className={styles.notice}>
              <Alert variant="error">{globalError}</Alert>
            </div>
          )}
          {globalOk && (
            <div className={styles.notice}>
              <Alert variant="success">{globalOk}</Alert>
            </div>
          )}

          <div className={styles.card}>
            <h2 className={styles.section}>Account</h2>

            {/* Username */}
            <div className={styles.field}>
              <label htmlFor="username" className={styles.label}>Username</label>

              <div className={styles.control}>
                <FormInput
                  id="username"
                  label=""
                  name="username"
                  value={form.username}
                  onChange={onChange}
                  disabled={!edit.username}
                  error={errors.username}
                />
              </div>

              <div className={styles.actions}>
                {!edit.username ? (
                  <Button type="button" size="sm" onClick={() => toggleEdit('username', true)}>
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => saveField('username')}
                      disabled={savingField === 'username'}
                    >
                      {savingField === 'username' ? 'Saving…' : 'Save'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => cancelField('username')}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>

              <p className={styles.help}>
                {errors.username ? errors.username : helpers.username}
              </p>
            </div>

            {/* Email */}
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>Email</label>

              <div className={styles.control}>
                <FormInput
                  id="email"
                  label=""
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={onChange}
                  disabled={!edit.email}
                  error={errors.email}
                />
              </div>

              <div className={styles.actions}>
                {!edit.email ? (
                  <Button type="button" size="sm" onClick={() => toggleEdit('email', true)}>
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => saveField('email')}
                      disabled={savingField === 'email'}
                    >
                      {savingField === 'email' ? 'Saving…' : 'Save'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => cancelField('email')}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>

              <p className={styles.help}>
                {errors.email ? errors.email : helpers.email}
              </p>
            </div>

            <hr className={styles.hr} />

            <h2 className={styles.section}>Password</h2>

            {hasPassword && (
              <div className={styles.field}>
                <label htmlFor="currentPassword" className={styles.label}>Current password</label>
                <div className={styles.control}>
                  <FormInput
                    id="currentPassword"
                    label=""
                    name="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                  />
                </div>
                <div className={styles.actions} />
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="newPassword" className={styles.label}>New password</label>
              <div className={styles.control}>
                <FormInput
                  id="newPassword"
                  label=""
                  name="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create a password"
                />
              </div>
              <div className={styles.actions} />
            </div>

            <div className={styles.field}>
              <label htmlFor="newPasswordConfirm" className={styles.label}>Confirm new password</label>
              <div className={styles.control}>
                <FormInput
                  id="newPasswordConfirm"
                  label=""
                  name="newPasswordConfirm"
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  placeholder="Repeat the new password"
                  error={errors.password}
                />
              </div>
              <div className={styles.actions} />
              <p className={styles.help}>
                {errors.password ? errors.password : helpers.passwordTip}
              </p>
            </div>

            <div className={styles.field}>
              <span className={styles.label} aria-hidden="true" />
              <div className={styles.control}>
                <Button
                  type="button"
                  size="sm"
                  onClick={savePassword}
                  disabled={savingField === 'password'}
                  className={styles.primaryBlock}
                >
                  {savingField === 'password' ? 'Saving…' : 'Save password'}
                </Button>
              </div>
              <div className={styles.actions} />
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
