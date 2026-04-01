import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import PreKickoffForm from './components/PreKickoffForm'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SavedDoc, FormData } from './types'
import { Sun, Moon, LogOut, User } from 'lucide-react'
import './App.css'

const API_URL = 'http://localhost:5000/api';

function AppContent() {
  const { user, logout, loading, token } = useAuth();
  const [view, setView] = useState<'dashboard' | 'form'>('dashboard');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [editingDoc, setEditingDoc] = useState<SavedDoc | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('liga_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('liga_theme', theme);
  }, [theme]);

  if (loading) return null;

  if (!user) {
    return (
      <div className="auth-page">
        {authMode === 'login' ? (
          <LoginPage onToggleSignup={() => setAuthMode('signup')} />
        ) : (
          <SignupPage onToggleLogin={() => setAuthMode('login')} />
        )}
      </div>
    );
  }

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleSave = async (formData: FormData) => {
    if (!token) return;

    const body = {
      clientName: formData.nome,
      date: formData.kickoff_date || formData.data,
      implantador: formData.implantador,
      data: formData
    };

    try {
      let response;
      if (editingDoc) {
        response = await fetch(`${API_URL}/documents/${editingDoc.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(body)
        });
      } else {
        response = await fetch(`${API_URL}/documents`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ ...body, type: 'pre-kickoff' })
        });
      }

      if (response.ok) {
        setView('dashboard');
        setEditingDoc(null);
      } else {
        const errData = await response.json();
        alert('Erro ao salvar: ' + errData.error);
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Falha ao conectar com o servidor');
    }
  };

  return (
    <div className="app-container">
      <header className="main-header">
        <div className="header-content">
          <div className="brand" onClick={() => { setView('dashboard'); setEditingDoc(null); }}>
            <span className="logo">🔬</span>
            <span className="title">LIGA</span>
          </div>
          
          <div className="header-actions">
            <div className="user-info">
              <User size={16} />
              <span>{user.name} (@{user.username})</span>
            </div>
            
            <button onClick={toggleTheme} className="theme-toggle" title="Alternar Tema">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            
            <button onClick={logout} className="logout-btn" title="Sair">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {view === 'dashboard' ? (
          <Dashboard 
            onNewDoc={() => { setEditingDoc(null); setView('form'); }}
            onViewDoc={(doc) => { setEditingDoc(doc); setView('form'); }}
          />
        ) : (
          <PreKickoffForm 
            initialData={editingDoc?.data}
            onSave={handleSave}
            onCancel={() => setView('dashboard')}
          />
        )}
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App
