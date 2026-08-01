import React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';

const Label = React.forwardRef(
  (
    {
      style,
      htmlFor,
      ...props
    },
    ref
  ) => (
    <LabelPrimitive.Root
      ref={ref}
      htmlFor={htmlFor}
      style={{
        fontSize: '0.875rem',
        fontWeight: '500',
        lineHeight: '1.25rem',
        fontFamily: 'monospace',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        ...style,
      }}
      {...props}
    />
  )
);

Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
