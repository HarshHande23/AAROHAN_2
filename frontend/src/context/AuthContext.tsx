import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authApi } from '../api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role?: UserRole) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => Promise<void>;
  hasRole: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('apaar_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('apaar_auth_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('apaar_auth_token');
      if (storedToken) {
        try {
          const userData = await authApi.getMe();
          setUser(userData);
          localStorage.setItem('apaar_user', JSON.stringify(userData));
        } catch (err) {
          console.error("Auth check failed:", err);
          logout();
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string, role?: UserRole) => {
    setIsLoading(true);
    try {
      const data = await authApi.login(email, password, role);
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem('apaar_auth_token', data.access_token);
      localStorage.setItem('apaar_user', JSON.stringify(data.user));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('apaar_auth_token');
    localStorage.removeItem('apaar_user');
  };

  const switchRole = async (newRole: UserRole) => {
    try {
      const data = await authApi.switchRole(newRole);
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem('apaar_auth_token', data.access_token);
      localStorage.setItem('apaar_user', JSON.stringify(data.user));
    } catch (err) {
      console.error("Role switch error:", err);
      // Fallback for seamless demo testing if backend role switch isn't yet reached
      if (user) {
        const updated = { ...user, role: newRole };
        setUser(updated);
        localStorage.setItem('apaar_user', JSON.stringify(updated));
      }
    }
  };

  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!token && !!user,
      isLoading,
      login,
      logout,
      switchRole,
      hasRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

