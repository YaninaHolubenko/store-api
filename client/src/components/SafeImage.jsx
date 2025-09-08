// client/src/components/SafeImage.jsx
import React, { useEffect, useMemo, useState } from 'react';

/**
 * SafeImage: resilient <img> with graceful fallback and absolute URL resolution.
 * - If `src` is relative, it will be resolved against REACT_APP_API_URL.
 * - Supports `fallback` (raw SVG markup or any URL/data:) and `fallbackSrc`.
 * - Prevents infinite onError loops.
 * - Lazy loading and no-referrer by default.
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function toAbsUrl(src) {
  if (!src) return null;
  if (/^(https?:)?\/\//i.test(src) || /^data:/i.test(src)) return src;
  const needsSlash = !src.startsWith('/');
  return `${API_URL}${needsSlash ? '/' : ''}${src}`;
}

function isSvgMarkup(s) {
  return typeof s === 'string' && /^\s*<svg[\s>]/i.test(s);
}

function svgToDataUri(svg) {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

export default function SafeImage({
  src,
  alt = '',
  className = '',
  loading = 'lazy',
  decoding = 'async',
  referrerPolicy = 'no-referrer',
  fallback,      // raw <svg>...</svg> or URL/data:
  fallbackSrc,   // explicit fallback URL/data:
  makeAbsolute = true,
  onError,
  ...rest
}) {
  // Resolve the primary image source
  const primarySrc = useMemo(() => {
    if (!src) return null;
    return makeAbsolute ? toAbsUrl(src) : src;
  }, [src, makeAbsolute]);

  // Normalize fallback into a final URL/data: (supports raw SVG)
  const normalizedFallback = useMemo(() => {
    const val = fallbackSrc || fallback || null;
    if (!val) return null;
    if (isSvgMarkup(val)) return svgToDataUri(val);
    const url = String(val);
    return makeAbsolute ? toAbsUrl(url) : url;
  }, [fallbackSrc, fallback, makeAbsolute]);

  // Keep the current src so we can switch to fallback on error once
  const [currentSrc, setCurrentSrc] = useState(primarySrc || normalizedFallback);

  useEffect(() => {
    setCurrentSrc(primarySrc || normalizedFallback || null);
  }, [primarySrc, normalizedFallback]);

  const handleError = (e) => {
    if (normalizedFallback && currentSrc !== normalizedFallback) {
      setCurrentSrc(normalizedFallback);
    }
    if (typeof onError === 'function') onError(e);
  };

  if (!currentSrc) return null;

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      referrerPolicy={referrerPolicy}
      onError={handleError}
      {...rest}
    />
  );
}
