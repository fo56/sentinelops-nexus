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
  const location = useLocation();
  const navigate = useNavigate();

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
      {adminModules.map((module) => {
        const IconComponent = module.icon;
        const isActive = location.pathname === module.path;

        return (
          <button
            key={module.path}
            onClick={() => navigate(module.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
              fontFamily: \"'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif\",
              fontSize: '0.875rem',
              fontWeight: isActive ? '700' : '600',
              letterSpacing: '0.05em',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
          >
            <IconComponent size={16} />
            <span>{module.title}</span>
          </button>
        );
      })}
    </div>
  );
};
