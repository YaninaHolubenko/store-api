// client\src\components\Container.jsx
import React from 'react';
import styles from './Container.module.css';

export default function Container({ children, className = '', ...props }) {
  return (
    <div className={`${styles.root} ${className}`} {...props}>
      {children}
    </div>
  );
}
