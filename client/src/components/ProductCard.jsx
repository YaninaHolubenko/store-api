// ProductCard: compact product tile used on the home page
import React from 'react';
import { Link } from 'react-router-dom';
import styles from './ProductCard.module.css';

export default function ProductCard({ product, category }) {
  // product: { id, name, price, image }
  // category: { label, href } | null

  const img = product.image || '';
  const price = typeof product.price !== 'undefined' ? Number(product.price).toFixed(2) : '';

  return (
    <div className={styles.card}>
      <div className={styles.imgWrap}>
        {img ? (
          <img
            className={styles.img}
            src={img}
            alt={product.name}
            onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x400?text=No+Image'; }}
          />
        ) : null}
      </div>

      <div className={styles.body}>
        <div className={styles.name}>{product.name}</div>

        <div className={styles.category}>
          {category ? (
            <Link to={category.href} style={{ textDecoration: 'none' }}>
              {category.label}
            </Link>
          ) : null}
        </div>

        <div className={styles.price}>£{price}</div>

        <Link className={styles.btn} to={`/product/${product.id}`}>
          Details
        </Link>
      </div>
    </div>
  );
}
