// Simple reusable grid for product cards
import React from 'react';
import ProductCard from './ProductCard';
import styles from './ProductsGrid.module.css';

// props:
// - products: normalized array [{ id, name, price, image, ... }]
// - categoryOf: function(product) => { label, href } | null
export default function ProductsGrid({ products, categoryOf }) {
  return (
    <div className={styles.grid}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} category={categoryOf ? categoryOf(p) : null} />
      ))}
    </div>
  );
}
