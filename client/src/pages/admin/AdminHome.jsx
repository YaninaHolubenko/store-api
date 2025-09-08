//client/src/pages/admin/AdminHome.jsx
import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Container from '../../components/Container';
import styles from './AdminHome.module.css';

export default function AdminHome() {
  const { isAdmin } = useAuth();

  // Guard: only admins can view this page
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <Container>
      {/* Simple admin landing */}
      <h1 className={styles.title}>Admin Dashboard</h1>

      <div className={styles.grid}>
        <Link to="/admin/orders" className={styles.card} aria-label="Manage orders">
          <div className={styles.cardTitle}>Orders</div>
          <div className={styles.cardDesc}>View & update order statuses</div>
        </Link>

        <Link to="/admin/products" className={styles.card} aria-label="Manage products">
          <div className={styles.cardTitle}>Products</div>
          <div className={styles.cardDesc}>Create, edit, delete products</div>
        </Link>

        <Link to="/admin/users" className={styles.card} aria-label="Manage users">
          <div className={styles.cardTitle}>Users</div>
          <div className={styles.cardDesc}>Browse users and roles</div>
        </Link>
      </div>
    </Container>
  );
}
