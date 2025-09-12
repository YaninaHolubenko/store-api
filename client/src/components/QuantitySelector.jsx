//client\src\components\QuantitySelector.jsx
import React from 'react';
import styles from './QuantitySelector.module.css';

export default function QuantitySelector({
  value,
  min = 1,
  max = 99,
  onChange,
  disabled = false,
}) {
  // Clamp helper
  const clamp = (v) => Math.max(min, Math.min(max, v));

  const dec = () => {
    if (disabled) return;
    const next = clamp((Number(value) || min) - 1);
    onChange(next);
  };

  const inc = () => {
    if (disabled) return;
    const next = clamp((Number(value) || min) + 1);
    onChange(next);
  };

  const onInput = (e) => {
    const v = Math.floor(Number(e.target.value) || min);
    onChange(clamp(v));
  };

  return (
    <div className={styles.row} aria-label="Quantity selector">
      <button type="button" className={styles.btn} onClick={dec} disabled={disabled || value <= min}>−</button>
      <input
        type="number"
        className={styles.input}
        min={min}
        max={max}
        value={value}
        onChange={onInput}
        disabled={disabled}
      />
      <button type="button" className={styles.btn} onClick={inc} disabled={disabled || value >= max}>+</button>
    </div>
  );
}
