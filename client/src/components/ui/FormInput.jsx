// Labeled input with consistent structure, states, and optional right slot (eye icon etc.)
import React, { useId, useState } from 'react';

export default function FormInput({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  onFocus,
  placeholder,
  autoComplete,
  required = false,

  // visual / layout props
  blockClassName,
  labelClassName,
  inputClassName,
  inputProps = {},
  style,

  // states
  disabled = false,
  error = '',            // string | boolean
  helperText = '',       // string under the input (shown even without error, e.g. hint)

  // password toggle
  showPasswordToggle = true,

  // custom right content (overrides built-in toggle if provided)
  rightSlot = null,
}) {
  const reactId = useId();
  const inputId = id || `${name || 'input'}-${reactId}`;

  // normalize error text and flags
  const hasError = Boolean(error);
  const errorText = typeof error === 'string' ? error : '';

  // password reveal
  const [reveal, setReveal] = useState(false);
  const canToggle = showPasswordToggle && type === 'password' && !rightSlot;
  const inputType = canToggle && reveal ? 'text' : type;

  // a11y ids
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  // base inline styles (can be overridden by class names)
  const baseInputStyle = {
    width: '100%',
    height: 36,
    padding: canToggle || rightSlot ? '0 44px 0 10px' : '0 10px',
    boxSizing: 'border-box',
    borderRadius: 8,
    border: `1px solid ${hasError ? '#d92d20' : '#cfcfcf'}`,
    outline: 'none',
    background: disabled ? '#f7f7f7' : '#fff',
    color: disabled ? '#9b9b9b' : '#111',
  };

  const baseLabelStyle = {
    fontSize: 14,
    color: '#444',
    marginBottom: 6,
    fontWeight: 600,
  };

  const helperStyle = {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 1.35,
    color: hasError ? '#d92d20' : '#6b7280',
  };

  return (
    <label htmlFor={inputId} className={blockClassName} style={{ display: 'block', ...style }}>
      {label ? <div className={labelClassName} style={baseLabelStyle}>{label}</div> : null}

      <div style={{ position: 'relative', width: '100%' }}>
        <input
          id={inputId}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          className={inputClassName}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={
            hasError ? errorId : (helperText ? helperId : undefined)
          }
          style={baseInputStyle}
          {...inputProps}
        />

        {/* Right-side content: custom slot > password toggle > nothing */}
        {rightSlot ? (
          <div
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 32,
              pointerEvents: disabled ? 'none' : 'auto',
            }}
          >
            {rightSlot}
          </div>
        ) : canToggle ? (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? 'Hide password' : 'Show password'}
            aria-pressed={reveal ? 'true' : 'false'}
            disabled={disabled}
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
              cursor: disabled ? 'not-allowed' : 'pointer',
              color: '#111',
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
        ) : null}
      </div>

      {(helperText || hasError) && (
        <div
          id={hasError ? errorId : helperId}
          role={hasError ? 'alert' : undefined}
          style={helperStyle}
        >
          {hasError ? errorText : helperText}
        </div>
      )}
    </label>
  );
}
