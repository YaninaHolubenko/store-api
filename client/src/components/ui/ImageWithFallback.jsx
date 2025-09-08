// client/src/components/ui/ImageWithFallback.jsx
// Thin wrapper around SafeImage to keep backward compatibility with existing props.
// - Uses SafeImage for actual image rendering and fallback handling.
// - Preserves placeholder UI when `src` is missing.

import React from 'react';
import SafeImage from '../SafeImage';
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

  // Delegate to SafeImage; it will resolve absolute URL and handle fallback swapping
  return (
    <SafeImage
      src={src}
      alt={alt}
      className={className}
      fallbackSrc={fallbackSrc}
      loading="lazy"
      {...imgProps}
    />
  );
}
