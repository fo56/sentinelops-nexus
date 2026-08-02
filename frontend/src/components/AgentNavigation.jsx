import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Zap,
  Wrench,
  BookOpen,
} from 'lucide-react';
import { NavLink } from './NavLink';

const agentModules = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    path: '/ranger/dashboard',
  },
  {
    title: 'Ops Planner',
    icon: Zap,
    path: '/ranger/ops-planner',
  },
  {
    title: 'Knowledge',
    icon: BookOpen,
    path: '/knowledge',
  },
];

export default function AgentNavigation() {
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
      {agentModules.map((module) => (
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
