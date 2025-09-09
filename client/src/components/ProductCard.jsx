// ProductCard: compact product tile used on the home page
import React from 'react';
import { Link } from 'react-router-dom';
import SafeImage from './SafeImage';
import styles from './ProductCard.module.css';

export default function ProductCard({ product, category }) {
  const img = product.image_url || product.image || '';

  const priceNumber =
    typeof product.price === 'number' ? product.price : Number(product.price || 0);
  const price =
    Number.isFinite(priceNumber)
      ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'GBP' }).format(priceNumber)
      : '';

  return (
    <div className={styles.card}>
      <div className={styles.imgWrap}>
        <SafeImage
          src={img}
          alt={product.name}
          className={styles.img}
          loading="lazy"
          referrerPolicy="no-referrer"
          fallback={
            'data:image/svg+xml;utf8,' +
            encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
                 <rect width="100%" height="100%" fill="#f7f7f7"/>
               </svg>`
            )
          }
        />
      </div>

      <div className={styles.body}>
        <div className={styles.name}>{product.name}</div>

        <div className={styles.category}>
          {category ? (
            <Link to={category.href} className={styles.link}>
              {category.label}
            </Link>
          ) : null}
        </div>

        <div className={styles.price}>{price}</div>

        <Link className={styles.btn} to={`/product/${product.id}`}>
          Details
        </Link>
      </div>
    </div>
  );
}
