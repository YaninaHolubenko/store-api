// Labeled input with consistent structure and classes passed from the page
import React from 'react';

export default function FormInput({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  required = false,
  // Pass page-specific classes to avoid changing styles
  blockClassName,
  labelClassName,
  inputClassName,
  // Extra props for input (e.g., autoCapitalize/autoCorrect)
  inputProps = {},
}) {
  // Render label wrapper to keep vertical spacing consistent
  return (
    <label htmlFor={id} className={blockClassName}>
      {label ? <div className={labelClassName}>{label}</div> : null}
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className={inputClassName}
        {...inputProps}
      />
    </label>
  );
}
