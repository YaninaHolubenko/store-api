//client\src\components\SearchBar.jsx
import React from 'react';
import styles from './SearchBar.module.css';

export default function SearchBar({ value, onChange, onReset, placeholder = 'Search products…' }) {
  return (
    <div className={styles.row}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={styles.input}
      />
      {(value?.trim()) && (
        <button type="button" className={styles.reset} onClick={onReset}>
          Reset
        </button>
      )}
    </div>
  );
}
