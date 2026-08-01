import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Wrench,
  BookOpen,
} from 'lucide-react';

const technicianModules = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    path: '/technician/dashboard',
  },
  {
    title: 'Facility Issues',
    icon: Wrench,
    path: '/facility-ops',
  },
  {
    title: 'Knowledge Base',
    icon: BookOpen,
    path: '/knowledge',
  },
];

export default function TechnicianNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

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
      {technicianModules.map((module) => {
        const IconComponent = module.icon;
        const isActive = location.pathname === module.path;

        return (
          <button
            key={module.path}
            onClick={() => navigate(module.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              flex: 'shrink 0',
              minWidth: 'auto',
              backgroundColor: isActive 
                ? 'rgba(255, 255, 255, 0.15)'
                : 'transparent',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
              fontSize: '0.875rem',
              fontWeight: isActive ? '700' : '600',
              letterSpacing: '0.05em',
              whiteSpace: 'nowrap',
              transform: isActive ? 'scale(1.08)' : 'scale(1)',
              boxShadow: 'none'
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#ffffff';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
              }
            }}
          >
            <IconComponent size={16} strokeWidth={2.5} />
            <span>{module.title}</span>
          </button>
        );
      })}
    </div>
  );
}
