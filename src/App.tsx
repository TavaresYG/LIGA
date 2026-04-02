import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import PreKickoffForm from './components/PreKickoffForm'
import KickoffForm from './components/KickoffForm'
import AdminPanel from './components/AdminPanel'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import RankingPage from './pages/RankingPage'
import StorePage from './pages/StorePage'
import StatementPage from './pages/StatementPage'
import GoalsPage from './pages/GoalsPage'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SavedDoc, FormData } from './types'
import { Sun, Moon, LogOut, User, LayoutDashboard, Trophy, ShoppingBag, Settings, Receipt, ChevronDown, FileText, Target, Award } from 'lucide-react'
import './App.css'
import './styles/goals.css'

const API_URL = 'http://localhost:5000/api';

type View = 'dashboard' | 'form' | 'ranking' | 'loja' | 'extrato' | 'kickoff' | 'goals';

function AppContent() {
  const { user, logout, loading, token } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [editingDoc, setEditingDoc] = useState<SavedDoc | null>(null);
  const [userRole, setUserRole] = useState<string>('member');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('liga_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('liga_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/me/role`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        // Failsafe for Yuri.Tavares and handle roles
        let role = d.role || 'member';
        if (user?.username === 'Yuri.Tavares') role = 'admin';
        setUserRole(role);
      })
      .catch(() => {});
  }, [token, user]);

  const canAccessAdmin = userRole === 'admin' || userRole === 'organizador';

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

  const handleSave = async (formData: FormData, docType: 'pre-kickoff' | 'kickoff' = 'pre-kickoff') => {
    if (!token) return;
    const body = {
      clientName: formData.nome,
      date: formData.kickoff_date || formData.data,
      implantador: formData.implantador,
      data: formData,
      type: docType
    };
    try {
      let response;
      if (editingDoc) {
        response = await fetch(`${API_URL}/documents/${editingDoc.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(body)
        });
      } else {
        response = await fetch(`${API_URL}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(body)
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
      alert('Falha ao conectar com o servidor');
    }
  };


  const handleNavClick = (v: View) => {
    setView(v);
    setEditingDoc(null);
    setActiveDropdown(null);
  };

  return (
    <div className="app-container">
      <header className="main-header">
        <div className="header-content">
          <div className="header-left">
            <div className="brand" onClick={() => handleNavClick('dashboard')}>
              <span className="logo">🔬</span>
              <span className="title">LIGA</span>
            </div>
          </div>

          <nav className="main-nav">
            <button className={`nav-btn ${view === 'dashboard' ? 'active' : ''}`} onClick={() => handleNavClick('dashboard')}>
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </button>

            {/* DOCUMENTOS DROPDOWN */}
            <div className="nav-dropdown">
              <button 
                className={`nav-btn ${(view === 'form' || view === 'kickoff') ? 'active' : ''}`}
                onMouseEnter={() => setActiveDropdown('docs')}
                onClick={() => setActiveDropdown(activeDropdown === 'docs' ? null : 'docs')}
              >
                <FileText size={18} />
                <span>Documentos</span>
                <ChevronDown size={14} className={activeDropdown === 'docs' ? 'rotated' : ''} />
              </button>
              {activeDropdown === 'docs' && (
                <div className="dropdown-menu" onMouseLeave={() => setActiveDropdown(null)}>
                  <button onClick={() => handleNavClick('form')}>📋 Pré Kick Off</button>
                  <button onClick={() => handleNavClick('kickoff')}>🚀 Kick Off</button>
                </div>
              )}
            </div>

            {/* METAS DROPDOWN */}
            <div className="nav-dropdown">
              <button 
                className={`nav-btn ${view === 'goals' ? 'active' : ''}`}
                onMouseEnter={() => setActiveDropdown('metas')}
                onClick={() => setActiveDropdown(activeDropdown === 'metas' ? null : 'metas')}
              >
                <Target size={18} />
                <span>Metas</span>
                <ChevronDown size={14} className={activeDropdown === 'metas' ? 'rotated' : ''} />
              </button>
              {activeDropdown === 'metas' && (
                <div className="dropdown-menu" onMouseLeave={() => setActiveDropdown(null)}>
                  <button onClick={() => handleNavClick('goals')}>🎯 Visualizar Metas</button>
                  <button onClick={() => handleNavClick('ranking')}>🏆 Ranking</button>
                </div>
              )}
            </div>

            {/* PONTUAÇÃO DROPDOWN */}
            <div className="nav-dropdown">
              <button 
                className={`nav-btn ${(view === 'loja' || view === 'extrato') ? 'active' : ''}`}
                onMouseEnter={() => setActiveDropdown('pontos')}
                onClick={() => setActiveDropdown(activeDropdown === 'pontos' ? null : 'pontos')}
              >
                <Award size={18} />
                <span>Pontuação</span>
                <ChevronDown size={14} className={activeDropdown === 'pontos' ? 'rotated' : ''} />
              </button>
              {activeDropdown === 'pontos' && (
                <div className="dropdown-menu" onMouseLeave={() => setActiveDropdown(null)}>
                  <button onClick={() => handleNavClick('loja')}>🛍️ Loja de Prêmios</button>
                  <button onClick={() => handleNavClick('extrato')}>📜 Meu Extrato</button>
                </div>
              )}
            </div>
          </nav>

          <div className="header-actions">
            <div className="user-pill">
              <User size={14} />
              <span>{user?.name ? user.name.split(' ')[0] : 'Usuário'}</span>
            </div>

            <div className="action-icons">
              {canAccessAdmin && (
                <button onClick={() => setShowAdmin(true)} className="icon-btn-header gear" title="Painel Admin">
                  <Settings size={20} />
                </button>
              )}

              <button onClick={toggleTheme} className="icon-btn-header" title="Alternar Tema">
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>

              <button onClick={logout} className="icon-btn-header logout" title="Sair">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {view === 'dashboard' && (
          <Dashboard
            onNewDoc={() => { setEditingDoc(null); setView('form'); }}
            onViewDoc={(doc) => { setEditingDoc(doc); setView(doc.type === 'kickoff' ? 'kickoff' : 'form'); }}
          />
        )}
        {view === 'form' && (
          <PreKickoffForm
            initialData={editingDoc?.data}
            onSave={(formData) => handleSave(formData, 'pre-kickoff')}
            onCancel={() => setView('dashboard')}
          />
        )}
        {view === 'kickoff' && (
          <KickoffForm
            initialData={editingDoc?.data}
            onSave={(formData) => handleSave(formData, 'kickoff')}
            onCancel={() => setView('dashboard')}
          />
        )}
        {view === 'ranking' && <RankingPage />}
        {view === 'loja' && <StorePage />}
        {view === 'extrato' && <StatementPage />}
        {view === 'goals' && <GoalsPage />}
      </main>

      {showAdmin && <AdminPanel role={userRole} onClose={() => setShowAdmin(false)} />}
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
