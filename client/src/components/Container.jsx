// Simple layout container with max-width and horizontal padding
import React from 'react';
import styles from './Container.module.css';

export default function Container({ children, className = '', ...props }) {
  return (
    <div className={`${styles.root} ${className}`} {...props}>
      {children}
    </div>
  );
}
