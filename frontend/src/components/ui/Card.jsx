import React from 'react';

const cardVariants = {
  default: {
    backgroundColor: 'var(--bg-secondary)',
    borderColor: 'var(--border-color)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
  },
  elevated: {
    backgroundColor: 'var(--bg-tertiary)',
    borderColor: 'rgba(41, 163, 153, 0.15)',
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.5)',
  },
  tactical: {
    backgroundColor: 'var(--bg-tertiary)',
    borderColor: 'rgba(41, 163, 153, 0.15)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  },
  glass: {
    backgroundColor: 'rgba(12, 14, 18, 0.5)',
    backdropFilter: 'blur(8px)',
    borderColor: 'rgba(41, 163, 153, 0.08)',
  },
};

const Card = React.forwardRef(
  ({ style, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      style={{
        border: '1px solid',
        borderRadius: '0.5rem',
        color: 'var(--text-primary)',
        transition: 'all 0.3s ease',
        ...cardVariants[variant],
        ...style,
      }}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef(
  ({ style, ...props }, ref) => (
    <div
      ref={ref}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.375rem',
        padding: '1.5rem',
        ...style,
      }}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef(
  ({ style, ...props }, ref) => (
    <h3
      ref={ref}
      style={{
        fontSize: '1.5rem',
        fontWeight: '600',
        lineHeight: '1.2',
        letterSpacing: '-0.025em',
        fontFamily: 'monospace',
        color: 'var(--text-primary)',
        ...style,
      }}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef(
  ({ style, ...props }, ref) => (
    <p
      ref={ref}
      style={{
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
        ...style,
      }}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef(
  ({ style, ...props }, ref) => (
    <div
      ref={ref}
      style={{
        padding: '1.5rem',
        paddingTop: '0',
        ...style,
      }}
      {...props}
    />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef(
  ({ style, ...props }, ref) => (
    <div
      ref={ref}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '1.5rem',
        paddingTop: '0',
        ...style,
      }}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
