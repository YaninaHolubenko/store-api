// client\src\components\Header.jsx
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
  const { user, isAuth, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);

  // Close menu after navigation action
  function closeMenu() {
    setOpen(false);
  }

  function onLogout() {
    // Ensure server-side session logout + client cleanup
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
              {/* Orders visible for authenticated users */}
              <Link to="/orders">Orders</Link>

              {/* Admin link only for admins */}
              {isAdmin && <Link to="/admin">Admin</Link>}

              {/* Profile link visible for authenticated users */}
              <Link to="/profile">Profile</Link>

              {/* Greeting + role badge (admin only) */}
              <span className={styles.muted}>
                {/* keep greeting simple; badge stands next to it */}
                Hi, <strong>{user?.username || user?.email || 'user'}</strong>
              </span>
              {isAdmin && (
                <span className={styles.roleBadge} title="Administrator">Admin</span>
              )}

              <button onClick={onLogout} className={styles.logoutBtn}>
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
                {/* Orders in mobile menu */}
                <Link to="/orders" onClick={closeMenu}>Orders</Link>

                {/* Admin in mobile menu (admins only) */}
                {isAdmin && <Link to="/admin" onClick={closeMenu}>Admin</Link>}

                {/* Profile in mobile menu */}
                <Link to="/profile" onClick={closeMenu}>Profile</Link>

                {/* Greeting + role badge (admin only) */}
                <div className={styles.muted}>
                  Hi, <strong>{user?.username || user?.email || 'user'}</strong>
                  {isAdmin && (
                    <span className={styles.roleBadge} title="Administrator" style={{ marginLeft: 6 }}>
                      Admin
                    </span>
                  )}
                </div>

                <button onClick={onLogout} className={styles.logoutBtn}>
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
