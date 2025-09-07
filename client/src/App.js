// App with routes + responsive header component
import React from 'react';
import { Routes, Route } from 'react-router-dom';

import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import OAuthCallback from './pages/OAuthCallback';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import Checkout from './pages/Checkout';
import Header from './components/Header';
import Profile from './pages/Profile';
import OrderDetails from './pages/OrderDetails';

// Admin pages
import AdminHome from './pages/admin/AdminHome';
import AdminOrders from './pages/admin/AdminOrders';
import AdminOrderDetails from './pages/admin/AdminOrderDetails';
import AdminProducts from './pages/admin/AdminProducts'; // <-- NEW

export default function App() {
  return (
    <div>
      <Header />
      <Routes>
        {/* Public / user routes */}
        <Route path="/" element={<Home />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetails />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />

        {/* Admin routes (components validate role inside) */}
        <Route path="/admin" element={<AdminHome />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/orders/:id" element={<AdminOrderDetails />} />
        <Route path="/admin/products" element={<AdminProducts />} /> {/* <-- NEW */}

        {/* Fallback */}
        <Route path="*" element={<div style={{ padding: '1rem' }}>Not found</div>} />
      </Routes>
    </div>
  );
}
