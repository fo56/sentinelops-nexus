import { Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';

// Core Pages
import Login from '../pages/Login';
import AgentDashboard from '../pages/AgentDashboard';
import TechnicianDashboard from '../pages/TechnicianDashboard';
import AdminDashboard from '../pages/AdminDashboard';
import Users from '../pages/Users';
import CreateRanger from '../pages/CreateRanger';

// Knowledge Crystal Pages
import KnowledgeCrystal from '../pages/KnowledgeCrystal';


// Ranger Module Pages
import OpsPlanner from '../pages/OpsPlanner';
import FacilityOps from '../pages/FacilityOps';

export const routes = [
  // Public Routes
  { path: '/login', element: <Login /> },

  // Admin Routes
  {
    path: '/admin/dashboard',
    element: (
      <ProtectedRoute requiredRole="admin">
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/overview',
    element: (
      <ProtectedRoute requiredRole="admin">
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/users',
    element: (
      <ProtectedRoute requiredRole="admin">
        <Users />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/create-ranger',
    element: (
      <ProtectedRoute requiredRole="admin">
        <CreateRanger />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/ops-planner',
    element: (
      <ProtectedRoute requiredRole="admin">
        <OpsPlanner />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/facility-ops',
    element: (
      <ProtectedRoute requiredRole="admin">
        <FacilityOps />
      </ProtectedRoute>
    ),
  },

  // Agent/Ranger Dashboard
  {
    path: '/agent/dashboard',
    element: (
      <ProtectedRoute requiredRole="agent">
        <AgentDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/ranger/dashboard',
    element: (
      <ProtectedRoute>
        <AgentDashboard />
      </ProtectedRoute>
    ),
  },

  // Technician Dashboard
  {
    path: '/technician/dashboard',
    element: (
      <ProtectedRoute requiredRole="technician">
        <TechnicianDashboard />
      </ProtectedRoute>
    ),
  },

  // Knowledge Crystal Routes
  {
    path: '/knowledge',
    element: (
      <ProtectedRoute>
        <KnowledgeCrystal />
      </ProtectedRoute>
    ),
  },

  // Ranger Module Routes
  { path: '/facility-ops', element: <ProtectedRoute><FacilityOps /></ProtectedRoute> },
  { path: '/ops-planner', element: <ProtectedRoute><OpsPlanner /></ProtectedRoute> },
  { path: '/ranger/ops-planner', element: <ProtectedRoute><OpsPlanner /></ProtectedRoute> },
  { path: '/ranger/facility-ops', element: <ProtectedRoute><FacilityOps /></ProtectedRoute> },


  // Default Routes
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
];
