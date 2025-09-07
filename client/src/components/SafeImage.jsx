// client/src/components/SafeImage.jsx
import React, { useEffect, useMemo, useState } from 'react';

/**
 * SafeImage: resilient <img> with graceful fallback.
 * - Shows placeholder when src fails to load
 * - Resets error state when `src` changes
 * - Supports either SVG markup (auto-encoded) or an explicit fallbackSrc
 * - Uses lazy loading + no-referrer by default
 */
export default function SafeImage({
  src,
  alt = '',
  className = '',
  loading = 'lazy',
  referrerPolicy = 'no-referrer',
  /** Optional explicit fallback URL (e.g., a PNG). If omitted, `fallbackSvg` is used. */
  fallbackSrc,
  /** Raw SVG markup or data URL used as a fallback when image fails. */
  fallbackSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect width="100%" height="100%" fill="%23f3f4f6"/></svg>',
  /** Preserve user onError if provided; will be called after internal handling. */
  onError: userOnError,
  ...rest
}) {
  const [broken, setBroken] = useState(false);

  // Reset broken state whenever the src changes
  useEffect(() => {
    setBroken(false);
  }, [src]);

  // Build fallback URL once (data URL from SVG or provided fallbackSrc)
  const computedFallback = useMemo(() => {
    if (fallbackSrc) return fallbackSrc;
    if (!fallbackSvg) return 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

    const s = String(fallbackSvg);
    if (s.startsWith('data:')) return s;             // already a data URL
    if (/^https?:\/\//i.test(s)) return s;           // a regular URL passed by mistake
    // Encode raw SVG markup into a data URL
    const encoded = encodeURIComponent(s);
    return `data:image/svg+xml;charset=UTF-8,${encoded}`;
  }, [fallbackSrc, fallbackSvg]);

  const resolvedSrc = broken || !src ? computedFallback : src;

  const handleError = (e) => {
    // Switch to fallback once; if fallback also fails we won't loop
    if (!broken) setBroken(true);
    if (typeof userOnError === 'function') userOnError(e);
  };

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      loading={loading}
      referrerPolicy={referrerPolicy}
      onError={handleError}
      {...rest}
    />
  );
}
