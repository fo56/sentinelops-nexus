import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { routes } from './router/routes';

/**
 * Main App Component
 * Integrates Knowledge Crystal, Doc Sage, Identity Vault, Admin Dashboard,
 * Analytics, and Data Export frontend components */
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