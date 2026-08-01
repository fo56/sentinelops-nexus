import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { routes } from './router/routes';

/**
 * Main App Component
 * Integrates Phase 1, 2, 3, and 4 frontend components
 * 
 * Phase 1: Knowledge Crystal, Doc Sage
 * Phase 2: Identity Vault, Admin Dashboard
 * Phase 3: 2FA, Biometric Auth, Analytics
 * Phase 4: Notifications, Data Export
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {routes.map((route, index) => (
            <Route key={index} path={route.path} element={route.element} />
          ))}
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;