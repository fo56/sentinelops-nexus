import { useLocation, useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Zap,
  Wrench,
  LayoutDashboard,
  BookOpen,
} from 'lucide-react';
import { NavLink } from './NavLink';

const adminModules = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    path: '/admin/dashboard',
  },
  {
    title: 'Users',
    icon: Users,
    path: '/admin/users',
  },
  {
    title: 'Create Ranger',
    icon: UserPlus,
    path: '/admin/create-ranger',
  },
  {
    title: 'Ops Planner',
    icon: Zap,
    path: '/admin/ops-planner',
  },
  {
    title: 'Facility Ops',
    icon: Wrench,
    path: '/admin/facility-ops',
  },
  {
    title: 'Knowledge',
    icon: BookOpen,
    path: '/knowledge',
  },
];

export default function AdminNavigation() {
  return (
    <div
      style={{
        display: 'flex',
        gap: '0.75rem',
        backgroundColor: '#0c0e12',
        overflowX: 'visible',
        padding: '1rem',
        minHeight: 'auto',
        width: '100%',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {adminModules.map((module) => (
        <NavLink 
          key={module.path} 
          to={module.path} 
          variant="scale"
          icon={module.icon}
        >
          {module.title}
        </NavLink>
      ))}
    </div>
  );
}