// Reusable alert box.
// Props:
//  - variant?: 'info' | 'success' | 'warning' | 'error' (default 'info')
//  - title?: string
//  - children: ReactNode
import React from 'react';
import styles from './Alert.module.css';

function cx(...cls) {
  return cls.filter(Boolean).join(' ');
}

export default function Alert({ variant = 'info', title, children, ...rest }) {
  // Give assistive tech meaningful roles
  const role = variant === 'error' || variant === 'warning' ? 'alert' : 'status';
  const ariaLive = variant === 'error' ? 'assertive' : 'polite';

  return (
    <div
      className={cx(styles.alert, styles[variant])}
      role={role}
      aria-live={ariaLive}
      {...rest}
    >
      {title ? <span className={styles.title}>{title}</span> : null}
      <span>{children}</span>
    </div>
  );
}
