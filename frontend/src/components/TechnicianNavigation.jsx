import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Wrench,
  BookOpen,
} from 'lucide-react';
import { NavLink } from './NavLink';

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
      {technicianModules.map((module) => (
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
