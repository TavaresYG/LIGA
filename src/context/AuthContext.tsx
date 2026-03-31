import React, { createContext, useContext, useState, useEffect } from 'react';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('liga_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (identifier: string, _pass: string) => {
    // In a real app, this would be an API call
    const users = JSON.parse(localStorage.getItem('liga_registered_users') || '[]');
    const found = users.find((u: User) => u.email === identifier || u.username === identifier);
    
    if (found) {
      setUser(found);
      localStorage.setItem('liga_user', JSON.stringify(found));
      return true;
    }
    return false;
  };

  const signup = async (email: string, username: string, name: string, _pass: string) => {
    const users = JSON.parse(localStorage.getItem('liga_registered_users') || '[]');
    if (users.some((u: User) => u.email === email || u.username === username)) {
      return false;
    }
    
    const newUser = { id: `user-${Date.now()}`, email, username, name };
    users.push(newUser);
    localStorage.setItem('liga_registered_users', JSON.stringify(users));
    
    setUser(newUser);
    localStorage.setItem('liga_user', JSON.stringify(newUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('liga_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
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
