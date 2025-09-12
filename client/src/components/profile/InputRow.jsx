// client/src/components/profile/InputRow.jsx
import React from 'react';

export default function InputRow({
  label,
  htmlFor,
  children,
  className,
  contentClassName,
  actions = null,
  actionsClassName,
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor}>{label}</label>
      <div className={contentClassName}>{children}</div>
      {actions ? <div className={actionsClassName}>{actions}</div> : <div /> }
    </div>
  );
}
