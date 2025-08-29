// Generic image with a built-in fallback and optional placeholder
// Usage: <ImageWithFallback src={url} alt="..." className={...} placeholderClassName={...} />
import React from 'react';
import styles from './ImageWithFallback.module.css';

export default function ImageWithFallback({
  src,
  alt = '',
  fallbackSrc = 'https://placehold.co/800x600?text=No+Image',
  className,
  placeholderClassName,
  placeholderText = 'No image',
  ...imgProps
}) {
  // If no src at all — render a styled placeholder box
  if (!src) {
    return (
      <div className={placeholderClassName || styles.placeholder}>
        {placeholderText}
      </div>
    );
  }

  // If the primary image fails, swap to fallback (prevent loops by checking current src)
  const onError = (e) => {
    if (e.currentTarget && e.currentTarget.src !== fallbackSrc) {
      e.currentTarget.src = fallbackSrc;
    }
  };

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={onError}
      {...imgProps}
    />
  );
}
