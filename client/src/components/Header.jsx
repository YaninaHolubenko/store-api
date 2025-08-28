// Responsive header with hamburger menu and cart icon
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import styles from './Header.module.css';

function CartIconLink() {
  const { count, total } = useCart();
  const label =
    typeof count === 'number' && count > 0
      ? `Cart: ${count} item(s) • £${Number(total || 0).toFixed(2)}`
      : 'Cart';

  return (
    <Link to="/cart" aria-label={label} title={label} className={styles.cartLink}>
      {/* Simple cart outline icon (SVG) */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 6h14l-1.4 8.4a2 2 0 0 1-2 1.6H9.5a2 2 0 0 1-2-1.7L6 6z" />
        <path d="M9 10V4m6 6V4" />
        <circle cx="9" cy="20" r="1.6" />
        <circle cx="18" cy="20" r="1.6" />
      </svg>
      {typeof count === 'number' && count > 0 && (
        <span className={styles.badge}>{count}</span>
      )}
    </Link>
  );
}

export default function Header() {
  const navigate = useNavigate();
  const { user, isAuth, logout } = useAuth();
  const [open, setOpen] = useState(false);

  // Close menu after navigation action
  function closeMenu() {
    setOpen(false);
  }

  function onLogout() {
    logout();
    setOpen(false);
    navigate('/');
  }

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.brand} onClick={closeMenu}>
        Store
      </Link>

      <div className={styles.right}>
        {/* Desktop links */}
        <div className={styles.links}>
          <CartIconLink />
          {!isAuth ? (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          ) : (
            <>
              <span style={{ opacity: 0.8 }}>
                Hi, <strong>{user?.username || user?.email || 'user'}</strong>
              </span>
              <button
                onClick={onLogout}
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid #222',
                  background: '#111',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Logout
              </button>
            </>
          )}
        </div>

        {/* Hamburger (mobile) */}
        <button
          type="button"
          className={styles.hamburger}
          aria-label="Menu"
          aria-expanded={open ? 'true' : 'false'}
          onClick={() => setOpen((v) => !v)}
        >
          {/* simple hamburger icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        {/* Mobile dropdown menu */}
        {open && (
          <div className={styles.menu} role="menu">
            <CartIconLink />
            {!isAuth ? (
              <>
                <Link to="/login" onClick={closeMenu}>Login</Link>
                <Link to="/register" onClick={closeMenu}>Register</Link>
              </>
            ) : (
              <>
                <div style={{ opacity: 0.8 }}>
                  Hi, <strong>{user?.username || user?.email || 'user'}</strong>
                </div>
                <button
                  onClick={onLogout}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: '1px solid #222',
                    background: '#111',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Logout
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
