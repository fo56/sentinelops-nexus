import { useLocation, useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  LogIn,
  FileText,
  Activity,
  Building2,
  LayoutDashboard,
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
    title: 'Login History',
    icon: LogIn,
    path: '/admin/login-history',
  },
  {
    title: 'Mission Documents',
    icon: FileText,
    path: '/admin/mission-documents',
  },
  {
    title: 'Mission Progress',
    icon: Activity,
    path: '/admin/mission-progress',
  },
  {
    title: 'Headquarters Info',
    icon: Building2,
    path: '/admin/headquarters-info',
  },
];

export default function AdminLayout({ children }) {
  // Navigation bar component to be passed to DashboardLayout
  const navigationBar = (
    <div
      style={{
        display: 'flex',
        gap: '0',
        padding: '0.75rem 0',
        backgroundColor: 'var(--bg-primary)',
        overflowX: 'auto',
      }}
    >
      {adminModules.map((module) => (
        <NavLink 
          key={module.path} 
          to={module.path} 
          variant="underline"
          icon={module.icon}
        >
          {module.title}
        </NavLink>
      ))}
    </div>
  );
};
