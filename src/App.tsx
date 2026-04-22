import React, { useState, useEffect } from 'react'
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
import BIPanel from './pages/BIPanel'
import KickoffForm from './components/KickoffForm'
import PreKickoffForm from './components/PreKickoffForm'
import CronogramaForm from './components/CronogramaForm'
import AdminPanel from './components/AdminPanel'
import Dashboard from './components/Dashboard'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SavedDoc, FormData } from './types'
import {
  Sun, Moon, LogOut, User, LayoutDashboard, Trophy, ShoppingBag,
  Settings, ChevronDown, FileText, Target, Award, Briefcase
} from 'lucide-react'
import './App.css'

import BASE_API_URL from './api/config';
const API_URL = `${BASE_API_URL}/api`;

type View = 'dashboard' | 'form' | 'kickoff' | 'cronograma' | 'ranking' | 'loja' | 'extrato' | 'goals' | 'projects' | 'portfolios' | 'checklist' | 'distribuicao' | 'bi';

function AppContent() {
  const { user, logout, loading, token } = useAuth()
  const [view, setView] = useState<View>('dashboard')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [showAdmin, setShowAdmin] = useState(false)
  const [userRole, setUserRole] = useState<string>('member')
  const [editingDoc, setEditingDoc] = useState<SavedDoc | null>(null)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [pendingPointsCount, setPendingPointsCount] = useState(0)
  const [showSignup, setShowSignup] = useState(false)
  const [permissions, setPermissions] = useState<string[]>([])

  useEffect(() => {
    const savedTheme = localStorage.getItem('liga-theme') as 'light' | 'dark'
    if (savedTheme) setTheme(savedTheme)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('liga-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light')

  const DEFAULT_PERMISSIONS: Record<string, string[]> = {
    admin:      ['admin_panel', 'dashboard', 'form', 'kickoff', 'cronograma', 'ranking', 'loja', 'extrato', 'goals', 'projects', 'portfolios', 'checklist', 'distribuicao', 'bi'],
    organizador:['admin_panel', 'dashboard', 'form', 'kickoff', 'cronograma', 'ranking', 'loja', 'extrato', 'goals', 'projects', 'portfolios', 'checklist', 'distribuicao', 'bi'],
    member:     ['dashboard', 'ranking', 'loja', 'extrato', 'goals'],
  };

  useEffect(() => {
    if (!token) return;

    // Fetch permissions — fallback to role defaults if API fails or tables don't exist yet
    fetch(`${API_URL}/me/permissions`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.permissions && data.permissions.length > 0) {
          setPermissions(data.permissions);
        }
      })
      .catch(() => {});

    // Fetch role
    fetch(`${API_URL}/me/role`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setUserRole(data.role || 'member');
      })
      .catch(() => {});

    // Fetch statement for pending badge
    fetch(`${API_URL}/me/statement`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPendingPointsCount(data.filter((i: any) => i.type === 'task' && !i.approved).length);
        }
      })
      .catch(() => {});

    // ASANA AUTO-SYNC (Background Trigger)
    const autoSync = localStorage.getItem('asana_auto_sync') === 'true';
    const asanaToken = localStorage.getItem('asana_token');
    if (autoSync && asanaToken && (userRole === 'admin' || userRole === 'organizador')) {
      fetch(`${API_URL}/asana/sync`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          asanaToken, 
          workspaceId: localStorage.getItem('asana_workspace') 
        })
      }).catch(e => console.log('Auto-sync skipped or deferred:', e.message));
    }
  }, [token, userRole]);

  // If permissions not yet loaded from API, fall back to role defaults
  const hasPerm = (v: string) => {
    if (permissions.length > 0) return permissions.includes(v);
    const roleKey = (userRole || 'member').toLowerCase();
    return (DEFAULT_PERMISSIONS[roleKey] || DEFAULT_PERMISSIONS['member']).includes(v);
  };
  const canAccessAdmin = hasPerm('admin_panel');

  const handleNavClick = (v: View) => {
    setView(v);
    setEditingDoc(null);
    setActiveDropdown(null);
  };

  const handleSave = async (formData: FormData, docType: string) => {
    if (!token) return;
    const body = { client_name: formData.nome, date: formData.data, implantador: formData.implantador, data: formData, type: docType };
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

  if (loading) return <div className="loading-container"><div className="loader"></div></div>;

  if (!user) {
    return (
      <div className="auth-page">
        {showSignup
          ? <SignupPage onToggleLogin={() => setShowSignup(false)} />
          : <LoginPage onToggleSignup={() => setShowSignup(true)} />
        }
      </div>
    );
  }

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
            {/* DASHBOARD */}
            {hasPerm('dashboard') && (
              <button className={`nav-btn ${view === 'dashboard' ? 'active' : ''}`} onClick={() => handleNavClick('dashboard')}>
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </button>
            )}

            {/* PAINEL DROPDOWN */}
            {(hasPerm('projects') || hasPerm('portfolios') || hasPerm('bi')) && (
              <div className="nav-dropdown">
                <button
                  className={`nav-btn ${(view === 'projects' || view === 'portfolios' || view === 'bi') ? 'active' : ''}`}
                  onMouseEnter={() => setActiveDropdown('painel')}
                  onClick={() => setActiveDropdown(activeDropdown === 'painel' ? null : 'painel')}
                >
                  <Briefcase size={18} />
                  <span>Painel</span>
                  <ChevronDown size={14} className={activeDropdown === 'painel' ? 'rotated' : ''} />
                </button>
                {activeDropdown === 'painel' && (
                  <div className="dropdown-menu" onMouseLeave={() => setActiveDropdown(null)}>
                    {hasPerm('projects') && <button onClick={() => handleNavClick('projects')}>📅 Painel dos projetos</button>}
                    {hasPerm('portfolios') && <button onClick={() => handleNavClick('portfolios')}>💼 Painel de portfólios</button>}
                    {hasPerm('bi') && <button onClick={() => handleNavClick('bi')}>📊 Painel BI</button>}
                  </div>
                )}
              </div>
            )}

            {/* DOCUMENTOS DROPDOWN */}
            <div className="nav-dropdown">
              <button
                className={`nav-btn ${(view === 'form' || view === 'kickoff' || view === 'cronograma') ? 'active' : ''}`}
                onMouseEnter={() => setActiveDropdown('docs')}
                onClick={() => setActiveDropdown(activeDropdown === 'docs' ? null : 'docs')}
              >
                <FileText size={18} />
                <span>Documentos</span>
                <ChevronDown size={14} className={activeDropdown === 'docs' ? 'rotated' : ''} />
              </button>
              {activeDropdown === 'docs' && (
                <div className="dropdown-menu" onMouseLeave={() => setActiveDropdown(null)}>
                  <button onClick={() => { setEditingDoc(null); handleNavClick('form'); }}>📋 Pré Kick Off</button>
                  <button onClick={() => { setEditingDoc(null); handleNavClick('kickoff'); }}>🚀 Kick Off</button>
                  <button onClick={() => { setEditingDoc(null); handleNavClick('cronograma'); }}>📅 Cronograma</button>
                </div>
              )}
            </div>

            {/* METAS DROPDOWN */}
            {(hasPerm('goals') || hasPerm('ranking') || hasPerm('checklist')) && (
              <div className="nav-dropdown">
                <button
                  className={`nav-btn ${(view === 'goals' || view === 'ranking' || view === 'checklist') ? 'active' : ''}`}
                  onMouseEnter={() => setActiveDropdown('metas')}
                  onClick={() => setActiveDropdown(activeDropdown === 'metas' ? null : 'metas')}
                >
                  <Target size={18} />
                  <span>Metas</span>
                  <ChevronDown size={14} className={activeDropdown === 'metas' ? 'rotated' : ''} />
                </button>
                {activeDropdown === 'metas' && (
                  <div className="dropdown-menu" onMouseLeave={() => setActiveDropdown(null)}>
                    {hasPerm('goals') && <button onClick={() => handleNavClick('goals')}>🎯 Visualizar Metas</button>}
                    {hasPerm('ranking') && <button onClick={() => handleNavClick('ranking')}>🏆 Ranking</button>}
                    {hasPerm('checklist') && <button onClick={() => handleNavClick('checklist')}>📋 Checklist</button>}
                  </div>
                )}
              </div>
            )}

            {/* PONTUAÇÃO DROPDOWN */}
            {(hasPerm('loja') || hasPerm('extrato') || hasPerm('distribuicao')) && (
              <div className="nav-dropdown">
                <button
                  className={`nav-btn ${(view === 'loja' || view === 'extrato' || view === 'distribuicao') ? 'active' : ''}`}
                  onMouseEnter={() => setActiveDropdown('pontos')}
                  onClick={() => setActiveDropdown(activeDropdown === 'pontos' ? null : 'pontos')}
                >
                  <Award size={18} />
                  <span>Pontuação</span>
                  <ChevronDown size={14} className={activeDropdown === 'pontos' ? 'rotated' : ''} />
                </button>
                {activeDropdown === 'pontos' && (
                  <div className="dropdown-menu" onMouseLeave={() => setActiveDropdown(null)}>
                    {hasPerm('loja') && <button onClick={() => handleNavClick('loja')}>🛍️ Loja de Prêmios</button>}
                    {hasPerm('extrato') && (
                      <button onClick={() => handleNavClick('extrato')}>
                        📜 Meu Extrato
                        {pendingPointsCount > 0 && <span className="nav-pending-badge">!</span>}
                      </button>
                    )}
                    {hasPerm('distribuicao') && <button onClick={() => handleNavClick('distribuicao')}>⚖️ Distribuição de Pontos</button>}
                  </div>
                )}
              </div>
            )}
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
            onViewDoc={(doc) => { 
                setEditingDoc(doc); 
                if (doc.type === 'kickoff') setView('kickoff');
                else if (doc.type === 'cronograma') setView('cronograma');
                else setView('form');
            }}
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
        {view === 'cronograma' && (
          <CronogramaForm
            initialData={editingDoc?.data}
            onSave={(formData) => handleSave(formData, 'cronograma')}
            onCancel={() => setView('dashboard')}
          />
        )}
        {view === 'ranking' && <RankingPage />}
        {view === 'loja' && <StorePage />}
        {view === 'extrato' && <StatementPage />}
        {view === 'goals' && <GoalsPage />}
        {view === 'projects' && <ProjectsPanel />}
        {view === 'portfolios' && <PortfoliosPanel />}
        {view === 'checklist' && <ChecklistPage />}
        {view === 'distribuicao' && <PointDistributionPage />}
        {view === 'bi' && <BIPanel />}
      </main>

      {showAdmin && <AdminPanel role={userRole} permissions={permissions} onClose={() => setShowAdmin(false)} />}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
