// Reusable Button component.
// - Renders <Link> when `to` prop is passed, otherwise <button>
// - Props:
//   - to?: string (render Link)
//   - variant?: 'primary' | 'outline' | 'danger'
//   - size?: 'sm' | undefined
//   - block?: boolean (full width)
//   - type?: 'button' | 'submit' | 'reset'
//   - disabled?: boolean
//   - onClick?: () => void
//   - children: ReactNode
import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Button.module.css';

function cx(...cls) {
  return cls.filter(Boolean).join(' ');
}

export default function Button({
  to,
  variant = 'primary',
  size,
  block = false,
  type = 'button',
  disabled = false,
  onClick,
  children,
  ...rest
}) {
  const className = cx(
    styles.btn,
    variant && styles[variant],
    size && styles[size],
    block && styles.block
  );

  if (to) {
    // Link-style button
    return (
      <Link to={to} className={className} aria-disabled={disabled ? 'true' : undefined} {...rest}>
        {children}
      </Link>
    );
  }

  // Native button
  return (
    <button
      type={type}
      className={className}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}
