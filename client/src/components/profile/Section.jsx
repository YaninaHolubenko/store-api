// client/src/components/profile/Section.jsx
import React from 'react';

/** Simple visual section wrapper with optional title */
export default function Section({ title, children, className }) {
  return (
    <section className={className}>
      {title ? <h2 className="sectionTitle">{title}</h2> : null}
      {children}
    </section>
  );
}
