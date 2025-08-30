// Reusable Button component.
// - Renders <Link> when `to` prop is passed, otherwise <button>
// - Props:
//   - to?: string (render Link)
//   - variant?: 'primary' | 'outline' | 'danger'
//   - size?: 'sm' | undefined
//   - block?: boolean (full width)
//   - type?: 'button' | 'submit' | 'reset'
//   - disabled?: boolean
//   - className?: string (extra classes to append)
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
  className = '',
  onClick,
  children,
  ...rest
}) {
  const classes = cx(
    styles.btn,                       // base styles (always)
    variant && styles[variant],
    size && styles[size],
    block && styles.block,
    disabled && styles.disabledLink,  // for <Link> case
    className                         // extra classes from caller
  );

  if (to) {
    const handleLinkClick = (e) => {
      if (disabled) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      onClick?.(e);
    };

    return (
      <Link
        to={to}
        role="button"
        aria-disabled={disabled ? 'true' : undefined}
        className={classes}
        onClick={handleLinkClick}
        {...rest}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}
