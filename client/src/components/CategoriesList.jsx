//client\src\components\CategoriesList.jsx
import React, { useState, useEffect } from 'react';
import styles from './CategoriesList.module.css';

function toTitle(s) {
  if (!s) return '';
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}

/**
 * props:
 *  - categories: [{id,name,displayName}]
 *  - selectedId: number|null
 *  - onSelect(id|null)
 *  - title?: string
 */
export default function CategoriesList({ categories = [], selectedId, onSelect, title = 'Categories' }) {
  // on mobile we can collapse/expand the list
  const [open, setOpen] = useState(false);

  // if user selects from URL on desktop, keep open state sane on resize
  useEffect(() => {
    // close menu automatically when category changed (mobile UX)
    setOpen(false);
  }, [selectedId]);

  return (
    <aside className={styles.wrapper}>
      {/* Mobile toggle */}
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open ? 'true' : 'false'}
        aria-controls="cat-list"
      >
        {title}
        <span className={styles.chev} aria-hidden>▾</span>
      </button>

      {/* Desktop list + mobile dropdown */}
      <div id="cat-list" className={`${styles.list} ${open ? styles.listOpen : ''}`}>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`${styles.item} ${selectedId === null ? styles.active : ''}`}
          title="All"
        >
          All
        </button>

        {categories.map((c) => {
          const active = Number(selectedId) === Number(c.id);
          const label = c.displayName || toTitle(c.name || '');
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(Number(c.id))}
              className={`${styles.item} ${active ? styles.active : ''}`}
              title={c.name}
            >
              {label}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
