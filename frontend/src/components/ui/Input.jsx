import React from 'react';

const Input = React.forwardRef(
  ({ style, type = 'text', disabled = false, placeholder, ...props }, ref) => {
    return (
      <input
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          display: 'flex',
          height: '2.75rem',
          width: '100%',
          borderRadius: '0.5rem',
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-tertiary)',
          paddingLeft: '1rem',
          paddingRight: '1rem',
          paddingTop: '0.5rem',
          paddingBottom: '0.5rem',
          fontSize: '1rem',
          color: 'var(--text-primary)',
          fontFamily: 'monospace',
          transition: 'all 0.2s ease',
          cursor: disabled ? 'not-allowed' : 'auto',
          opacity: disabled ? 0.5 : 1,
          outlineOffset: '2px',
          ...style,
        }}
        ref={ref}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--primary)';
          e.currentTarget.style.boxShadow = '0 0 10px rgba(41, 163, 153, 0.15)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
