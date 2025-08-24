// App with routes + simple header showing auth status
import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import { useAuth } from './contexts/AuthContext';
import { useCart } from './contexts/CartContext';
import Cart from './pages/Cart';

/* Small cart icon link with badge */
function CartIconLink() {
  const { count, total } = useCart();

  const label =
    typeof count === 'number' && count > 0
      ? `Cart: ${count} item(s) • £${Number(total || 0).toFixed(2)}`
      : 'Cart';

  return (
    <Link
      to="/cart"
      aria-label={label}
      title={label}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: 8,
        textDecoration: 'none',
        color: '#111',
      }}
    >
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
      >
        {/* basket */}
        <path d="M6 6h14l-1.4 8.4a2 2 0 0 1-2 1.6H9.5a2 2 0 0 1-2-1.7L6 6z" />
        {/* handle */}
        <path d="M9 10V4m6 6V4" />
        {/* wheels */}
        <circle cx="9" cy="20" r="1.6" />
        <circle cx="18" cy="20" r="1.6" />
      </svg>

      {/* Badge */}
      {typeof count === 'number' && count > 0 && (
        <span
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            minWidth: 18,
            height: 18,
            padding: '0 4px',
            borderRadius: 9,
            background: '#111',
            color: '#fff',
            fontSize: 11,
            lineHeight: '18px',
            textAlign: 'center',
          }}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

function Header() {
  const navigate = useNavigate();
  const { user, isAuth, logout } = useAuth();

  const onLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav
      style={{
        padding: '1rem',
        borderBottom: '1px solid #eee',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <Link to="/">Store</Link>

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
        {/* Cart icon with badge */}
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
              }}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <div>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<div style={{ padding: '1rem' }}>Not found</div>} />
      </Routes>
    </div>
  );
}
