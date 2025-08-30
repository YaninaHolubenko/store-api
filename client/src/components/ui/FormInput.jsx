// Labeled input with consistent structure and classes passed from the page
import React, { useState } from 'react';

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
  blockClassName,
  labelClassName,
  inputClassName,
  inputProps = {},
  showPasswordToggle = true, // enables the eye for password inputs
}) {
  const [reveal, setReveal] = useState(false);
  const canToggle = showPasswordToggle && type === 'password';
  const inputType = canToggle && reveal ? 'text' : type;

  return (
    <label htmlFor={id} className={blockClassName}>
      {label ? <div className={labelClassName}>{label}</div> : null}

      <div style={{ position: 'relative', width: '100%' }}>
        <input
          id={id}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className={inputClassName}
          // add right padding only when the toggle is present
          style={canToggle ? { paddingRight: 44, boxSizing: 'border-box' } : undefined}
          {...inputProps}
        />

        {canToggle && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? 'Hide password' : 'Show password'}
            aria-pressed={reveal ? 'true' : 'false'}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 32,
              height: 32,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: '1px solid transparent',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            {reveal ? (
              // eye-off
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.3 1.7L1 3l3.2 3.2C2.9 7.1 1.7 8.4 1 10c1.7 4 6 7 11 7 2 0 3.8-.5 5.4-1.3L21 21l1.3-1.3L2.3 1.7zM12 15a3 3 0 01-3-3c0-.3.1-.6.2-.9l3.7 3.7c-.3.1-.6.2-.9.2zm0-10c5 0 9.3 3 11 7-.7 1.6-1.8 3-3.2 4.1l-1.5-1.5A8.7 8.7 0 0020.6 12 9.9 9.9 0 0012 7c-.9 0-1.8.1-2.7.4L7.7 5.8C9 5.3 10.5 5 12 5z" />
              </svg>
            ) : (
              // eye
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5c5 0 9.27 3.11 11 7-1.73 3.89-6 7-11 7S2.73 15.89 1 12c1.73-3.89 6-7 11-7zm0 3a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </label>
  );
}
