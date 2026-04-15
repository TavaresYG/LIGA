import React, { createContext, useContext, useState, useEffect } from 'react';

import BASE_API_URL from '../api/config';
const API_URL = `${BASE_API_URL}/api`;

interface User {
  id: string;
  email: string;
  username: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (identifier: string, pass: string) => Promise<boolean>;
  signup: (email: string, username: string, name: string, pass: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  token: string | null;
  permissions: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('liga_user');
    const savedToken = localStorage.getItem('liga_token');
    
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
      fetchPermissions(savedToken);
    }
    setLoading(false);
  }, []);

  const fetchPermissions = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/me/permissions`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPermissions(data.permissions || []);
      }
    } catch (err) {
      console.error('Failed to fetch permissions', err);
    }
  };

  const login = async (identifier: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });

      if (!response.ok) return false;

      const data = await response.json();
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('liga_user', JSON.stringify(data.user));
      localStorage.setItem('liga_token', data.token);
      fetchPermissions(data.token);
      return true;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  };

  const signup = async (email: string, username: string, name: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, name, password })
      });

      if (!response.ok) return false;

      const data = await response.json();
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('liga_user', JSON.stringify(data.user));
      localStorage.setItem('liga_token', data.token);
      fetchPermissions(data.token);
      return true;
    } catch (err) {
      console.error('Signup error:', err);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('liga_user');
    localStorage.removeItem('liga_token');
    setPermissions([]);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading, token, permissions }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
