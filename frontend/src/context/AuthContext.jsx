import React, { createContext, useState, useCallback, useEffect } from 'react';
import { authService } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize user from localStorage
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      validateAndLoadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const validateAndLoadUser = useCallback(async () => {
    try {
      setLoading(true);
      const userData = await authService.getCurrentUser();
      const userInfo = authService.getUserInfo();
      setUser({
        ...userData,
        ...userInfo,
      });
      setIsAuthenticated(true);
      setError(null);
    } catch (err) {
      localStorage.clear();
      setUser(null);
      setIsAuthenticated(false);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(
    async (email, password, isRanger = false) => {
      try {
        setLoading(true);
        setError(null);
        const response = isRanger
          ? await authService.rangerLogin(email, password)
          : await authService.adminLogin(email, password);

        const userData = await authService.getCurrentUser();
        const userInfo = authService.getUserInfo();
        setUser({
          ...userData,
          ...userInfo,
        });
        setIsAuthenticated(true);
        return response;
      } catch (err) {
        setError(err.message);
        setUser(null);
        setIsAuthenticated(false);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const tokenLogin = useCallback(async (token) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.tokenLogin(token);

      const userData = await authService.getCurrentUser();
      const userInfo = authService.getUserInfo();
      setUser({
        ...userData,
        ...userInfo,
      });
      setIsAuthenticated(true);
      return response;
    } catch (err) {
      setError(err.message);
      setUser(null);
      setIsAuthenticated(false);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    tokenLogin,
    logout,
    validateAndLoadUser,
    clearError: () => setError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
