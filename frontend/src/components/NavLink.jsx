import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { forwardRef } from 'react';

const NavLink = forwardRef(
  (
    {
      to,
      variant = 'default',
      icon: Icon,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    const variantClass = {
      default: 'nav-link-default',
      underline: 'nav-link-underline',
      scale: 'nav-link-scale',
    }[variant] || 'nav-link-default';

    const classes = `nav-link ${variantClass} ${isActive ? 'active' : ''} ${className}`;

    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={classes.trim()}
        {...props}
      >
        {Icon && <Icon size={16} strokeWidth={variant === 'scale' ? 2.5 : 2} />}
        <span>{children}</span>
      </RouterNavLink>
    );
  }
);

NavLink.displayName = 'NavLink';

export { NavLink };
