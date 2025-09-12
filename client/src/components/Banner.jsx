// client\src\components\Banner.jsx
import React from 'react';
import styles from './Banner.module.css';

/**
 * Props:
 * - variant: 'error' | 'success' | 'info' (default 'info')
 * - children: ReactNode (message content)
 * - onClose?: () => void  (optional close button)
 * - role?: string         (override aria role)
 */
export default function Banner({ variant = 'info', children, onClose, role }) {
  // Map variant to CSS class and recommended aria role
  const clazz =
    variant === 'error' ? styles.error :
    variant === 'success' ? styles.success :
    styles.info;

  const ariaRole = role || (variant === 'error' || variant === 'success' ? 'alert' : 'status');

  return (
    <div className={`${styles.wrapper} ${clazz}`} role={ariaRole}>
      <div style={{ marginTop: 2 }}>{children}</div>
      {onClose ? (
        <button
          type="button"
          className={styles.close}
          aria-label="Close"
          onClick={onClose}
          title="Close"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
