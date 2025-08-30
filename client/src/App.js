// App with routes + responsive header component
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import OAuthCallback from './pages/OAuthCallback';
import Cart from './pages/Cart';
import Header from './components/Header'; // responsive header with hamburger

export default function App() {
  // Keep layout minimal; Header handles auth/cart UI and responsiveness
  return (
    <div>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="*" element={<div style={{ padding: '1rem' }}>Not found</div>} />
      </Routes>
    </div>
  );
}
