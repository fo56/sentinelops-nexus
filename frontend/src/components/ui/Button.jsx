import React from 'react';

const buttonVariants = {
  default: {
    backgroundColor: 'var(--primary)',
    color: 'var(--text-inverse)',
    border: 'none',
  },
  destructive: {
    backgroundColor: '#ff4444',
    color: 'white',
    border: 'none',
  },
  outline: {
    backgroundColor: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  },
  secondary: {
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
  },
  ghost: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
  },
  link: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--primary)',
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  tactical: {
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid rgba(41, 163, 153, 0.2)',
    color: 'var(--text-primary)',
  },
  cyber: {
    backgroundColor: 'rgba(41, 163, 153, 0.08)',
    border: '1px solid var(--primary)',
    color: 'var(--primary)',
    boxShadow: '0 0 10px rgba(41, 163, 153, 0.15)',
  },
};

const sizeStyles = {
  default: {
    height: '2.5rem',
    paddingLeft: '1rem',
    paddingRight: '1rem',
    paddingTop: '0.5rem',
    paddingBottom: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  sm: {
    height: '2.25rem',
    paddingLeft: '0.75rem',
    paddingRight: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    borderRadius: '0.375rem',
  },
  lg: {
    height: '2.75rem',
    paddingLeft: '2rem',
    paddingRight: '2rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    borderRadius: '0.375rem',
  },
  xl: {
    height: '3.5rem',
    paddingLeft: '2.5rem',
    paddingRight: '2.5rem',
    fontSize: '1rem',
    fontWeight: '500',
    borderRadius: '0.5rem',
  },
  icon: {
    height: '2.5rem',
    width: '2.5rem',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

const Button = React.forwardRef(
  (
    {
      style,
      variant = 'default',
      size = 'default',
      disabled = false,
      className,
      ...props
    },
    ref
  ) => {
    const baseStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      whiteSpace: 'nowrap',
      borderRadius: '0.375rem',
      transition: 'all 0.2s ease',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      pointerEvents: disabled ? 'none' : 'auto',
      fontFamily: 'monospace',
      ...sizeStyles[size],
      ...buttonVariants[variant],
      ...style,
    };

    return (
      <button
        ref={ref}
        style={baseStyle}
        disabled={disabled}
        onMouseEnter={(e) => {
          if (!disabled) {
            if (variant === 'tactical' || variant === 'cyber') {
              e.currentTarget.style.borderColor = 'rgba(41, 163, 153, 0.4)';
              if (variant === 'cyber') {
                e.currentTarget.style.backgroundColor = 'var(--primary)';
                e.currentTarget.style.color = 'var(--text-inverse)';
              } else {
                e.currentTarget.style.backgroundColor = 'rgba(41, 163, 153, 0.12)';
              }
            } else if (variant === 'default') {
              e.currentTarget.style.backgroundColor = 'rgba(41, 163, 153, 0.6)';
            } else if (variant === 'ghost' || variant === 'outline' || variant === 'secondary') {
              e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            const newStyle = {
              ...buttonVariants[variant],
              ...sizeStyles[size],
            };
            Object.assign(e.currentTarget.style, newStyle);
          }
        }}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
