import React, { createContext, useContext, useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('liga_user');
    const savedToken = localStorage.getItem('liga_token');
    
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
    setLoading(false);
  }, []);

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
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading, token }}>
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
