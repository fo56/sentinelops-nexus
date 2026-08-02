import React from 'react';

const Input = React.forwardRef(
  ({ style, type = 'text', as = 'input', disabled = false, placeholder, children, ...props }, ref) => {
    const baseStyle = {
      display: 'flex',
      height: as === 'textarea' ? 'auto' : '2.75rem',
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
      fontFamily: as === 'textarea' ? 'inherit' : 'monospace',
      transition: 'all 0.2s ease',
      cursor: disabled ? 'not-allowed' : 'auto',
      opacity: disabled ? 0.5 : 1,
      outlineOffset: '2px',
      resize: as === 'textarea' ? 'vertical' : 'none',
      ...style,
    };

    const handleFocus = (e) => {
      e.currentTarget.style.borderColor = 'var(--primary)';
      e.currentTarget.style.boxShadow = '0 0 10px rgba(41, 163, 153, 0.15)';
    };

    const handleBlur = (e) => {
      e.currentTarget.style.borderColor = 'var(--border-color)';
      e.currentTarget.style.boxShadow = 'none';
    };

    if (as === 'textarea') {
      return (
        <textarea
          disabled={disabled}
          placeholder={placeholder}
          style={baseStyle}
          ref={ref}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
      );
    }

    if (as === 'select') {
      return (
        <select
          disabled={disabled}
          style={{...baseStyle, cursor: disabled ? 'not-allowed' : 'pointer'}}
          ref={ref}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        >
          {children}
        </select>
      );
    }

    return (
      <input
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        style={baseStyle}
        ref={ref}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
