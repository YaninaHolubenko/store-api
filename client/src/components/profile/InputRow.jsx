// client/src/components/profile/InputRow.jsx
import React from 'react';

/** A11y-friendly labeled row layout for profile inputs with optional actions */
export default function InputRow({
  label,
  htmlFor,
  children,
  className,
  contentClassName,
  actions = null,
  actionsClassName, // optional class for the actions column
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor}>{label}</label>
      <div className={contentClassName}>{children}</div>
      {actions ? <div className={actionsClassName}>{actions}</div> : <div /> }
    </div>
  );
}
