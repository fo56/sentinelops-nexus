import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children, requiredRole = null }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.warn('Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    console.warn(`Access denied. Required role: ${requiredRole}, User role: ${user?.role}`);
    return (
      <div className="error-container">
        <h2> Access Denied</h2>
        <p>You don't have permission to access this page. Required: {requiredRole}, Your role: {user?.role}</p>
      </div>
    );
  }

  return children;
}
