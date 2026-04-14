import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import RankingPage from './pages/RankingPage'
import StorePage from './pages/StorePage'
import StatementPage from './pages/StatementPage'
import GoalsPage from './pages/GoalsPage'
import ProjectsPanel from './pages/ProjectsPanel'
import PortfoliosPanel from './pages/PortfoliosPanel'
import ChecklistPage from './pages/ChecklistPage'
import PointDistributionPage from './pages/PointDistributionPage'
import KickoffForm from './components/KickoffForm'
import AdminPanel from './components/AdminPanel'
import Dashboard from './components/Dashboard'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SavedDoc, FormData } from './types'
import { Sun, Moon, LogOut, User, LayoutDashboard, Trophy, ShoppingBag, Settings, Receipt, ChevronDown, FileText, Target, Award, Briefcase, ClipboardList, Scale } from 'lucide-react'
import './App.css'
import './styles/themes.css'

import BASE_API_URL from './api/config';
const API_URL = `${BASE_API_URL}/api`;

type View = 'dashboard' | 'form' | 'ranking' | 'loja' | 'extrato' | 'kickoff' | 'goals' | 'projects' | 'portfolios' | 'checklist' | 'distribuicao';

function AppContent() {
  const { user, logout, loading, token } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showAdmin, setShowAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string>('member');
  const [pendingPointsCount, setPendingPointsCount] = useState(0);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [showSignup, setShowSignup] = useState(false);

  // For Kick-Off form
  const [currentDoc, setCurrentDoc] = useState<SavedDoc | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('liga-theme') as 'light' | 'dark';
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('liga-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  useEffect(() => {
    if (!token) return;

    const fetchPermissions = async () => {
      try {
        const res = await fetch(`${API_URL}/me/permissions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPermissions(data.permissions || []);
        }
      } catch (err) {
        console.error('Erro ao buscar permissões:', err);
      }
    };

    fetchPermissions();

    fetch(`${API_URL}/me/role`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setUserRole(data.role || 'member'));

    fetch(`${API_URL}/me/statement`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const pending = data.filter((item: any) => item.type === 'task' && !item.approved).length; 
          setPendingPointsCount(pending);
        }
      });
  }, [token]);

  const hasPerm = (v: string) => permissions.includes(v);

  const handleNavClick = (v: View) => {
    if (hasPerm(v)) setView(v);
    else setView('dashboard');
  };

  const handleNewDoc = () => {
    setCurrentDoc(null);
    setView('kickoff');
  };

  const handleEditDoc = (doc: SavedDoc) => {
    setCurrentDoc(doc);
    setView('kickoff');
  };

  if (loading) return <div className="loading-container"><div className="loader"></div></div>;
  
  if (!user) {
    return showSignup 
      ? <SignupPage onToggleLogin={() => setShowSignup(false)} /> 
      : <LoginPage onToggleSignup={() => setShowSignup(true)} />;
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo" onClick={() => setView('dashboard')}>
            <div className="logo-icon">L</div>
            <h1>LIGA</h1>
          </div>

          <div className="nav-center">
            {hasPerm('dashboard') && (
              <button className={`nav-btn ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
              </button>
            )}
            {hasPerm('ranking') && (
              <button className={`nav-btn ${view === 'ranking' ? 'active' : ''}`} onClick={() => setView('ranking')}>
                <Trophy size={20} />
                <span>Ranking</span>
              </button>
            )}
            {(hasPerm('projects') || hasPerm('portfolios')) && (
                <div className="dropdown">
                    <button className={`nav-btn ${(view === 'projects' || view === 'portfolios') ? 'active' : ''}`}>
                    <Briefcase size={20} />
                    <span>Painéis</span>
                    <ChevronDown size={14} />
                    </button>
                    <div className="dropdown-content">
                        {hasPerm('projects') && <button onClick={() => setView('projects')}>📅 Painel dos projetos</button>}
                        {hasPerm('portfolios') && <button onClick={() => setView('portfolios')}>💼 Painel de portifólios</button>}
                    </div>
                </div>
            )}
            {(hasPerm('goals') || hasPerm('checklist')) && (
               <div className="dropdown">
                  <button className={`nav-btn ${(view === 'goals' || view === 'checklist') ? 'active' : ''}`}>
                    <Target size={20} />
                    <span>Metas</span>
                    <ChevronDown size={14} />
                  </button>
                  <div className="dropdown-content">
                    {hasPerm('goals') && <button onClick={() => setView('goals')}>🎯 Visualizar Metas</button>}
                    {hasPerm('checklist') && <button onClick={() => setView('checklist')}>📋 Checklist Equipe</button>}
                  </div>
               </div>
            )}
            {(hasPerm('loja') || hasPerm('extrato') || hasPerm('distribuicao')) && (
                <div className="dropdown">
                    <button className={`nav-btn ${(view === 'loja' || view === 'extrato' || view === 'distribuicao') ? 'active' : ''}`}>
                    <ShoppingBag size={20} />
                    <span>Pontuação</span>
                    <ChevronDown size={14} />
                    </button>
                    <div className="dropdown-content">
                        {hasPerm('loja') && <button onClick={() => setView('loja')}>🛍️ Loja de Prêmios</button>}
                        {hasPerm('extrato') && (
                            <button onClick={() => setView('extrato')}>
                                📜 Meu Extrato 
                                {pendingPointsCount > 0 && <span className="nav-pending-badge">!</span>}
                            </button>
                        )}
                        {hasPerm('distribuicao') && <button onClick={() => setView('distribuicao')}>⚖️ Distribuição de Pontos</button>}
                    </div>
                </div>
            )}
          </div>

          <div className="nav-right">
            <button className="theme-toggle" onClick={toggleTheme} title="Alternar tema">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <div className="user-menu-wrapper">
              <div className="user-profile">
                <div className="avatar">{user.name.charAt(0)}</div>
                <div className="user-info">
                  <span className="user-name">{user.name}</span>
                  <span className="user-role">{userRole}</span>
                </div>
                <ChevronDown size={16} />
              </div>
              <div className="profile-dropdown">
                {userRole === 'admin' && (
                  <button onClick={() => setShowAdmin(true)}>
                    <Settings size={18} /> Admin Panel
                  </button>
                )}
                <button onClick={logout} className="logout-btn">
                  <LogOut size={18} /> Sair
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="content-container">
        {view === 'dashboard' && hasPerm('dashboard') && (
            <Dashboard 
                onNewDoc={handleNewDoc} 
                onViewDoc={handleEditDoc} 
            />
        )}
        {view === 'ranking' && hasPerm('ranking') && <RankingPage />}
        {view === 'loja' && hasPerm('loja') && <StorePage />}
        {view === 'extrato' && hasPerm('extrato') && <StatementPage />}
        {view === 'goals' && hasPerm('goals') && <GoalsPage />}
        {view === 'projects' && hasPerm('projects') && <ProjectsPanel />}
        {view === 'portfolios' && hasPerm('portfolios') && <PortfoliosPanel />}
        {view === 'checklist' && hasPerm('checklist') && <ChecklistPage />}
        {view === 'distribuicao' && hasPerm('distribuicao') && <PointDistributionPage />}
        
        {view === 'kickoff' && <KickoffForm doc={currentDoc} onSave={() => setView('dashboard')} onCancel={() => setView('dashboard')} />}

        {!hasPerm(view) && hasPerm('dashboard') && (
             <Dashboard onNewDoc={handleNewDoc} onViewDoc={handleEditDoc} />
        )}
      </main>

      {showAdmin && <AdminPanel role={userRole} onClose={() => setShowAdmin(false)} />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
