import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Target, Edit3, Clock, Store, Star, Package, Gift, X,
  ChevronRight, Settings, LayoutDashboard, Users, Link,
  CheckCircle2, XCircle, Loader2, ShieldCheck, Eye, Lock
} from 'lucide-react';
import '../styles/admin.css';

import BASE_API_URL from '../api/config';
const API_URL = `${BASE_API_URL}/api`;

type AdminTab = 'meta' | 'registry' | 'pending' | 'store' | 'bonuses' | 'redemptions' | 'prize' | 'users' | 'roles' | 'integrations';

interface User { id: string; name: string; username: string; email?: string; role?: string; }
interface TaskType { id: string; name: string; points: number; tipo: string; validation_rule_name?: string; }
interface ValidationRule { id: string; name: string; }
interface StoreCategory { id: string; name: string; }
interface Pending { id: string; user_name: string; task_name: string; points_awarded: number; notes: string; created_at: string; }
interface Redemption { id: string; user_name: string; item_name: string; points_spent: number; status: string; created_at: string; }
interface StoreItem { id: string; name: string; cost_points: number; stock: number; category_name: string; image_url?: string; }
interface CustomRole { id: string; name: string; permissions: string[]; }

const ALL_VIEWS = [
  { id: 'dashboard',   label: '📊 Dashboard', type: 'view' },
  { id: 'form',        label: '📋 Pré Kick Off', type: 'view' },
  { id: 'kickoff',     label: '🚀 Kick Off', type: 'view' },
  { id: 'ranking',     label: '🏆 Ranking', type: 'view' },
  { id: 'loja',        label: '🛍️ Loja de Prêmios', type: 'view' },
  { id: 'extrato',     label: '📜 Meu Extrato', type: 'view' },
  { id: 'goals',       label: '🎯 Metas Ativas', type: 'view' },
  { id: 'projects',    label: '📅 Painel de Projetos', type: 'view' },
  { id: 'portfolios',  label: '💼 Painel de Portfólios', type: 'view' },
  { id: 'checklist',   label: '📋 Checklist Equipe', type: 'view' },
  { id: 'distribuicao',label: '⚖️ Distribuição de Pontos', type: 'view' },
  { id: 'bi',          label: '📊 Painel BI', type: 'view' },
  { id: 'project_create', label: '➕ Incluir novos projetos', type: 'action' },
  { id: 'project_import',  label: '📤 Importar planilha', type: 'action' },
  { id: 'project_template',label: '📥 Baixar modelo XLS', type: 'action' },
  { id: 'project_clear',  label: '🗑️ Limpar projetos', type: 'action' },
  { id: 'project_sync',   label: '🔄 Sincronizar Asana', type: 'action' },
];

const DEFAULT_ROLES: CustomRole[] = [
  {
    id: 'default-admin',
    name: 'Admin',
    permissions: ['dashboard','form','kickoff','ranking','loja','extrato','goals','projects','portfolios','checklist','distribuicao', 'bi']
  },
  {
    id: 'default-organizador',
    name: 'Organizador',
    permissions: ['dashboard','form','kickoff','ranking','loja','extrato','goals','checklist', 'bi']
  },
  {
    id: 'default-member',
    name: 'Membro',
    permissions: ['dashboard','ranking','loja','extrato','goals']
  },
];

const AdminPanel: React.FC<{ role: string; onClose: () => void }> = ({ role, onClose }) => {
  const { token } = useAuth();
  const [tab, setTab] = useState<AdminTab>(role === 'organizador' ? 'registry' : 'meta');
  const [users, setUsers] = useState<User[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [validationRules, setValidationRules] = useState<ValidationRule[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Pending[]>([]);
  const [storeCategories, setStoreCategories] = useState<StoreCategory[]>([]);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [msg, setMsg] = useState('');

  const h = (extra = {}) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...extra });
  const api = async (url: string, opts?: RequestInit) => {
    const res = await fetch(`${API_URL}${url}`, opts);
    const data = await res.json();
    return { ok: res.ok, data };
  };
  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  const fetchCustomRoles = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/roles`, { headers: h() });
      if (res.ok) setCustomRoles(await res.json());
    } catch (_) {}
  };

  useEffect(() => {
    if (!token) return;
    const requests = [
      fetch(`${API_URL}/users`, { headers: h() }),
      fetch(`${API_URL}/task-types`, { headers: h() }),
    ];

    if (role === 'admin') {
      requests.push(
        fetch(`${API_URL}/validation-rules`, { headers: h() }),
        fetch(`${API_URL}/task-completions/pending`, { headers: h() }),
        fetch(`${API_URL}/store/categories`, { headers: h() }),
        fetch(`${API_URL}/store/items`, { headers: h() }),
        fetch(`${API_URL}/redemptions/all`, { headers: h() })
      );
      fetchCustomRoles();
    }

    Promise.all(requests).then(async results => {
      const u = results[0]; const tt = results[1];
      if (u && u.ok) setUsers(await u.json());
      if (tt && tt.ok) setTaskTypes(await tt.json());
      if (role === 'admin') {
        const vr = results[2]; const pt = results[3];
        const sc = results[4]; const si = results[5]; const rd = results[6];
        if (vr && vr.ok) setValidationRules(await vr.json());
        if (pt && pt.ok) setPendingTasks(await pt.json());
        if (sc && sc.ok) setStoreCategories(await sc.json());
        if (si && si.ok) setStoreItems(await si.json());
        if (rd && rd.ok) setRedemptions(await rd.json());
      }
    });
  }, [token, role]);

  // ---- Roles ----
  const [roleForm, setRoleForm] = useState<{ id?: string; name: string; permissions: Set<string> }>({ name: '', permissions: new Set() });
  const [isSavingRole, setIsSavingRole] = useState(false);
  const togglePermission = (viewId: string) => {
    const next = new Set(roleForm.permissions);
    if (next.has(viewId)) next.delete(viewId); else next.add(viewId);
    setRoleForm({ ...roleForm, permissions: next });
  };
  const submitRole = async () => {
    if (!roleForm.name.trim()) { showMsg('❌ Nome do perfil é obrigatório'); return; }
    setIsSavingRole(true);
    const { ok } = await api('/admin/roles', {
      method: 'POST', headers: h(),
      body: JSON.stringify({ name: roleForm.name, permissions: Array.from(roleForm.permissions) })
    });
    if (ok) {
      showMsg('✅ Perfil salvo!');
      setRoleForm({ name: '', permissions: new Set() });
      fetchCustomRoles();
    } else { showMsg('❌ Erro ao salvar perfil'); }
    setIsSavingRole(false);
  };
  const editRole = (r: CustomRole) => setRoleForm({ id: r.id, name: r.name, permissions: new Set(r.permissions) });

  // All roles to display: defaults + custom (filter out custom if same name as default)
  const allRolesToShow = [
    ...DEFAULT_ROLES,
    ...customRoles.filter(cr => !DEFAULT_ROLES.some(d => d.name.toLowerCase() === cr.name.toLowerCase()))
  ];

  // ---- Meta ----
  const [taskForm, setTaskForm] = useState({ name: '', points: '', tipo: 'Individual', validationRuleId: '', newRule: '' });
  const submitTask = async () => {
    let ruleId = taskForm.validationRuleId;
    if (taskForm.newRule) {
      const { ok, data } = await api('/validation-rules', { method: 'POST', headers: h(), body: JSON.stringify({ name: taskForm.newRule }) });
      if (ok) { setValidationRules(prev => [...prev, data]); ruleId = data.id; }
    }
    const { ok } = await api('/task-types', { method: 'POST', headers: h(), body: JSON.stringify({ name: taskForm.name, points: Number(taskForm.points), tipo: taskForm.tipo, validationRuleId: ruleId || null }) });
    if (ok) { showMsg('✅ Meta criada!'); setTaskForm({ name: '', points: '', tipo: 'Individual', validationRuleId: '', newRule: '' }); const res = await fetch(`${API_URL}/task-types`, { headers: h() }); if (res.ok) setTaskTypes(await res.json()); }
    else showMsg('❌ Erro ao criar meta');
  };

  // ---- Registry ----
  const [compForm, setCompForm] = useState({ userId: '', taskTypeId: '', notes: '' });
  const submitCompletion = async () => {
    const { ok, data } = await api('/task-completions', { method: 'POST', headers: h(), body: JSON.stringify(compForm) });
    ok ? showMsg('✅ Conclusão enviada para aprovação!') : showMsg('❌ ' + (data.error || 'Erro ao registrar'));
    if (ok) setCompForm({ userId: '', taskTypeId: '', notes: '' });
  };

  // ---- Approve/Reject ----
  const approveTask = async (id: string, action: 'approve' | 'reject') => {
    const { ok } = await api(`/task-completions/${id}/${action}`, { method: 'PUT', headers: h() });
    if (ok) { showMsg(`✅ Tarefa ${action === 'approve' ? 'aprovada' : 'rejeitada'}!`); setPendingTasks(prev => prev.filter(p => p.id !== id)); }
  };

  // ---- Store ----
  const [itemForm, setItemForm] = useState({ name: '', costPoints: '', stock: '', categoryId: '', notes: '', imageUrl: '', newCategory: '' });
  const submitItem = async () => {
    let catId = itemForm.categoryId;
    if (itemForm.newCategory) {
      const { ok, data } = await api('/store/categories', { method: 'POST', headers: h(), body: JSON.stringify({ name: itemForm.newCategory }) });
      if (ok) { setStoreCategories(prev => [...prev, data]); catId = data.id; }
    }
    const { ok } = await api('/store/items', { method: 'POST', headers: h(), body: JSON.stringify({ name: itemForm.name, costPoints: Number(itemForm.costPoints), stock: Number(itemForm.stock), categoryId: catId || null, notes: itemForm.notes, imageUrl: itemForm.imageUrl || null }) });
    if (ok) { showMsg('✅ Item adicionado!'); setItemForm({ name: '', costPoints: '', stock: '', categoryId: '', notes: '', imageUrl: '', newCategory: '' }); const res = await fetch(`${API_URL}/store/items`, { headers: h() }); if (res.ok) setStoreItems(await res.json()); }
  };

  // ---- Bonus ----
  const [bonusForm, setBonusForm] = useState({ userId: '', points: '', reason: '' });
  const submitBonus = async () => {
    const { ok } = await api('/bonuses', { method: 'POST', headers: h(), body: JSON.stringify({ userId: bonusForm.userId, points: Number(bonusForm.points), reason: bonusForm.reason }) });
    ok ? showMsg('✅ Bônus concedido!') : showMsg('❌ Erro ao conceder bônus');
    if (ok) setBonusForm({ userId: '', points: '', reason: '' });
  };

  // ---- Prize ----
  const [prizeForm, setPrizeForm] = useState({ month: new Date().toISOString().slice(0, 7), title: '', description: '', imageUrl: '' });
  const submitPrize = async () => {
    const { ok } = await api('/featured-prize', { method: 'POST', headers: h(), body: JSON.stringify({ month: prizeForm.month, title: prizeForm.title, description: prizeForm.description, imageUrl: prizeForm.imageUrl || null }) });
    ok ? showMsg('✅ Prêmio mensal atualizado!') : showMsg('❌ Erro ao salvar prêmio');
  };

  const fulfillRedemption = async (id: string) => {
    const { ok } = await api(`/redemptions/${id}/fulfill`, { method: 'PUT', headers: h() });
    if (ok) { showMsg('✅ Entrega confirmada!'); setRedemptions(prev => prev.map(r => r.id === id ? { ...r, status: 'fulfilled' } : r)); }
  };

  // ---- Users ----
  const [userForm, setUserForm] = useState({ name: '', username: '', email: '', password: '', role: 'member' });
  const submitUser = async () => {
    if (!userForm.name || !userForm.username || !userForm.email || !userForm.password) { showMsg('❌ Preencha todos os campos!'); return; }
    const { ok, data } = await api('/users', { method: 'POST', headers: h(), body: JSON.stringify(userForm) });
    if (ok) { showMsg('✅ Usuário criado!'); setUserForm({ name: '', username: '', email: '', password: '', role: 'member' }); setUsers(prev => [...prev, data]); }
    else { showMsg('❌ ' + (data.error || 'Erro ao criar usuário')); }
  };
  const updateUserRole = async (userId: string, newRole: string) => {
    const { ok } = await api(`/users/${userId}/role`, { method: 'PUT', headers: h(), body: JSON.stringify({ role: newRole }) });
    if (ok) { showMsg('✅ Permissão atualizada!'); setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u)); }
    else { showMsg('❌ Erro ao atualizar permissão'); }
  };

  // ---- Integrations ----
  const [asanaToken, setAsanaToken] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [autoSync, setAutoSync] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('asana_token');
    const savedWorkspace = localStorage.getItem('asana_workspace');
    const savedAutoSync = localStorage.getItem('asana_auto_sync') === 'true';
    if (savedToken) setAsanaToken(savedToken);
    if (savedWorkspace) setWorkspaceId(savedWorkspace);
    setAutoSync(savedAutoSync);
  }, []);

  const handleSaveAsana = () => {
    if (!asanaToken.trim()) { showMsg('❌ O token do Asana é obrigatório.'); return; }
    localStorage.setItem('asana_token', asanaToken);
    localStorage.setItem('asana_workspace', workspaceId);
    localStorage.setItem('asana_auto_sync', String(autoSync));
    showMsg('✅ Configurações do Asana salvas!');
  };
  const handleTestAsana = async () => {
    if (!asanaToken.trim()) { showMsg('❌ Informe o token antes de testar.'); return; }
    setIsTesting(true);
    try {
      const response = await fetch('https://app.asana.com/api/1.0/users/me', { headers: { 'Authorization': `Bearer ${asanaToken}` } });
      if (response.ok) { const data = await response.json(); showMsg(`✅ Conexão bem-sucedida! Olá, ${data.data?.name || 'usuário'}!`); }
      else { const errorData = await response.json(); showMsg(`❌ Falha: ${errorData.errors?.[0]?.message || 'Token inválido'}`); }
    } catch { showMsg('❌ Erro ao conectar com a API do Asana.'); }
    finally { setIsTesting(false); }
  };
  const handleClearAsana = () => {
    localStorage.removeItem('asana_token'); localStorage.removeItem('asana_workspace'); localStorage.removeItem('asana_auto_sync');
    setAsanaToken(''); setWorkspaceId(''); setAutoSync(false);
    showMsg('✅ Credenciais removidas.');
  };

  // ---- Tabs ----
  const allTabs: { key: AdminTab; label: string; icon: React.ReactNode; minRole: string }[] = [
    { key: 'meta',         label: 'Metas',            icon: <Target size={18} />,       minRole: 'admin' },
    { key: 'registry',     label: 'Lançar Pontos',    icon: <Edit3 size={18} />,        minRole: 'organizador' },
    { key: 'pending',      label: 'Pendentes',        icon: <Clock size={18} />,        minRole: 'admin' },
    { key: 'store',        label: 'Loja',             icon: <Store size={18} />,        minRole: 'admin' },
    { key: 'bonuses',      label: 'Bônus',            icon: <Star size={18} />,         minRole: 'admin' },
    { key: 'redemptions',  label: 'Resgates',         icon: <Package size={18} />,      minRole: 'admin' },
    { key: 'users',        label: 'Usuários',         icon: <Users size={18} />,        minRole: 'admin' },
    { key: 'roles',        label: 'Perfis de Acesso', icon: <ShieldCheck size={18} />,  minRole: 'admin' },
    { key: 'prize',        label: 'Prêmio Mensal',    icon: <Gift size={18} />,         minRole: 'admin' },
    { key: 'integrations', label: 'Integrações',      icon: <Link size={18} />,         minRole: 'admin' },
  ];
  const visibleTabs = allTabs.filter(t => {
    if (role === 'admin') return true;
    if (role === 'organizador' && t.key === 'registry') return true;
    return false;
  });

  return (
    <div className="admin-overlay">
      <div className="admin-container">
        <aside className="admin-sidebar">
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <Settings className="logo-icon" size={24} />
              <div><h1>LIGA Admin</h1><span>{role === 'admin' ? 'Administrador' : 'Organizador'}</span></div>
            </div>
          </div>
          <nav className="sidebar-nav">
            {visibleTabs.map(t => (
              <button key={t.key} className={`sidebar-item ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                <span className="item-icon">{t.icon}</span>
                <span className="item-label">{t.label}</span>
                {t.key === 'pending' && pendingTasks.length > 0 && <span className="item-badge">{pendingTasks.length}</span>}
                {tab === t.key && <ChevronRight className="active-arrow" size={14} />}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button onClick={onClose} className="btn-logout-sidebar" title="Sair do Painel"><X size={20} /><span className="btn-text">Sair do Painel</span></button>
          </div>
        </aside>

        <main className="admin-main">
          <header className="main-header">
            <div className="header-info"><LayoutDashboard size={20} /><h2>{allTabs.find(t => t.key === tab)?.label}</h2></div>
            <button onClick={onClose} className="btn-close-mobile"><X size={20} /></button>
          </header>
          {msg && <div className="admin-msg">{msg}</div>}
          <div className="admin-content-area">

            {/* ── PERFIS DE ACESSO ── */}
            {tab === 'roles' && role === 'admin' && (
              <div>
                <h3 className="admin-section-title">Configurar Perfis e Permissões de Tela</h3>
                <div className="admin-form" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg-card)', padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '1.25rem' }}>
                  {/* Linha 1: Nome do Perfil ao lado do Campo */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-heading)', minWidth: '120px' }}>Nome do Perfil:</label>
                    <input 
                      placeholder="Ex: Consultor Especialista" 
                      value={roleForm.name} 
                      onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} 
                      style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', background: 'var(--bg-page)' }}
                    />
                  </div>

                  {/* Linha 3 (com espaçamento): Permissões Categorizadas */}
                  <div style={{ marginTop: '0.5rem' }}>
                    <label style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--accent)', display: 'block', marginBottom: '1.25rem', paddingBottom: '0.5rem', borderBottom: '2px solid var(--accent-light)' }}>
                      Acompanhamento de Acessos e Ações
                    </label>

                    {/* Bloco de Telas */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🖥️ Acesso às Telas</h4>
                      <div className="permissions-grid" style={{ display: 'grid', gap: '0.75rem' }}>
                        {ALL_VIEWS.filter(v => v.type === 'view').map(v => (
                          <div
                            key={v.id}
                            onClick={() => togglePermission(v.id)}
                            style={{
                              padding: '0.75rem 1rem', borderRadius: '0.75rem', cursor: 'pointer', transition: 'all 0.2s',
                              display: 'flex', alignItems: 'center', gap: '0.75rem',
                              border: `1px solid ${roleForm.permissions.has(v.id) ? 'var(--accent)' : 'var(--border-color)'}`,
                              background: roleForm.permissions.has(v.id) ? 'rgba(255,193,7,0.08)' : 'var(--bg-page)',
                            }}
                          >
                            {roleForm.permissions.has(v.id) ? <Eye size={18} color="var(--accent)" /> : <Lock size={18} color="var(--text-muted)" />}
                            <span style={{ fontSize: '0.85rem', fontWeight: roleForm.permissions.has(v.id) ? '700' : '500', color: roleForm.permissions.has(v.id) ? 'var(--text-heading)' : 'var(--text-main)' }}>{v.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bloco de Ações */}
                    <div>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚙️ Ações e Botões Permitidos</h4>
                      <div className="permissions-grid" style={{ display: 'grid', gap: '0.75rem' }}>
                        {ALL_VIEWS.filter(v => v.type === 'action').map(v => (
                          <div
                            key={v.id}
                            onClick={() => togglePermission(v.id)}
                            style={{
                              padding: '0.75rem 1rem', borderRadius: '0.75rem', cursor: 'pointer', transition: 'all 0.2s',
                              display: 'flex', alignItems: 'center', gap: '0.75rem',
                              border: `1px solid ${roleForm.permissions.has(v.id) ? '#3b82f6' : 'var(--border-color)'}`,
                              background: roleForm.permissions.has(v.id) ? 'rgba(59,130,246,0.08)' : 'var(--bg-page)',
                            }}
                          >
                            {roleForm.permissions.has(v.id) ? <CheckCircle2 size={18} color="#3b82f6" /> : <XCircle size={18} color="var(--text-muted)" />}
                            <span style={{ fontSize: '0.85rem', fontWeight: roleForm.permissions.has(v.id) ? '700' : '500', color: roleForm.permissions.has(v.id) ? 'var(--text-heading)' : 'var(--text-main)' }}>{v.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                    <button className="btn-admin-action" onClick={submitRole} disabled={isSavingRole}>
                      {isSavingRole ? <Loader2 className="animate-spin" size={16} /> : 'Salvar Perfil Personalizado'}
                    </button>
                    {roleForm.id && (
                      <button className="btn-admin-action" style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }} onClick={() => setRoleForm({ name: '', permissions: new Set() })}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="admin-section-title">Perfis do Sistema</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                  {allRolesToShow.map(cr => {
                    const isDefault = cr.id.startsWith('default-');
                    return (
                      <div key={cr.id} style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: `1px solid ${isDefault ? 'var(--accent)' : 'var(--border-color)'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>{cr.name}</h4>
                            {isDefault && <span style={{ fontSize: '0.65rem', padding: '2px 8px', background: 'var(--accent)', color: 'white', borderRadius: '999px', fontWeight: '700' }}>PADRÃO</span>}
                          </div>
                          {!isDefault && (
                            <button onClick={() => editRole(cr)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}><Edit3 size={16} /></button>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {cr.permissions.map(p => (
                            <span key={p} style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'var(--bg-hover)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                              {ALL_VIEWS.find(v => v.id === p)?.label || p}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── USUÁRIOS ── */}
            {tab === 'users' && role === 'admin' && (
              <div>
                <h3 className="admin-section-title">Adicionar Novo Membro</h3>
                <div className="admin-form">
                  <div className="afield"><label>Nome Completo</label><input value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="afield"><label>Nome de Usuário</label><input value={userForm.username} onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))} /></div>
                  <div className="afield"><label>E-mail</label><input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} /></div>
                  <div className="afield"><label>Senha Inicial</label><input type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} /></div>
                  <div className="afield">
                    <label>Perfil / Cargo</label>
                    <select value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}>
                      <option value="member">Membro (Padrão)</option>
                      <option value="organizador">Organizador (Lançar Pontos)</option>
                      <option value="admin">Administrador (Total)</option>
                      {customRoles.filter(cr => !DEFAULT_ROLES.some(d => d.name.toLowerCase() === cr.name.toLowerCase())).map(cr => (
                        <option key={cr.id} value={cr.name}>{cr.name}</option>
                      ))}
                    </select>
                  </div>
                  <button className="btn-admin-action" onClick={submitUser}>Criar Usuário</button>
                </div>

                <h3 className="admin-section-title" style={{ marginTop: '2rem' }}>Usuários Cadastrados / Permissões</h3>
                <table className="admin-table">
                  <thead><tr><th>Nome</th><th>Usuário</th><th>E-mail</th><th>Permissão</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 600 }}>{u.name}</td>
                        <td>@{u.username}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{u.email || '—'}</td>
                        <td>
                          <select value={u.role || 'member'} onChange={(e) => updateUserRole(u.id, e.target.value)}
                            style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.85rem', cursor: 'pointer' }}>
                            <option value="member">Membro</option>
                            <option value="organizador">Organizador</option>
                            <option value="admin">Admin</option>
                            {customRoles.filter(cr => !DEFAULT_ROLES.some(d => d.name.toLowerCase() === cr.name.toLowerCase())).map(cr => (
                              <option key={cr.id} value={cr.name}>{cr.name}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── METAS ── */}
            {tab === 'meta' && role === 'admin' && (
              <div>
                <h3 className="admin-section-title">Criar Nova Meta de Pontuação</h3>
                <div className="admin-form">
                  <div className="afield"><label>Tarefa (Meta)</label><input placeholder="Ex: Meta de 50 envios" value={taskForm.name} onChange={e => setTaskForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="afield"><label>Quantidade de Pontos</label><input type="number" value={taskForm.points} onChange={e => setTaskForm(f => ({ ...f, points: e.target.value }))} /></div>
                  <div className="afield">
                    <label>Tipo de Meta</label>
                    <select value={taskForm.tipo} onChange={e => setTaskForm(f => ({ ...f, tipo: e.target.value }))}>
                      <option>Individual</option><option>Equipe</option>
                    </select>
                  </div>
                  <div className="afield">
                    <label>Regra de Validação</label>
                    <select value={taskForm.validationRuleId} onChange={e => setTaskForm(f => ({ ...f, validationRuleId: e.target.value, newRule: '' }))}>
                      <option value="">-- Selecionar --</option>
                      {validationRules.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <input placeholder="Ou criar nova regra..." value={taskForm.newRule} onChange={e => setTaskForm(f => ({ ...f, newRule: e.target.value, validationRuleId: '' }))} style={{ marginTop: '6px' }} />
                  </div>
                  <button className="btn-admin-action" onClick={submitTask}>Salvar Meta</button>
                </div>
                <h3 className="admin-section-title" style={{ marginTop: '2rem' }}>Metas Atuais</h3>
                <table className="admin-table">
                  <thead><tr><th>Nome</th><th>Pontos</th><th>Tipo</th><th>Regra</th></tr></thead>
                  <tbody>{taskTypes.map(t => <tr key={t.id}><td>{t.name}</td><td>{t.points} pts</td><td>{t.tipo}</td><td>{t.validation_rule_name || '—'}</td></tr>)}</tbody>
                </table>
              </div>
            )}

            {/* ── LANÇAR PONTOS ── */}
            {tab === 'registry' && (
              <div>
                <h3 className="admin-section-title">Registrar Conclusão de Meta (Lançar Pontos)</h3>
                <p className="admin-hint">Selecione o membro e a meta atingida. O lançamento ficará pendente de aprovação final.</p>
                <div className="admin-form">
                  <div className="afield"><label>Membro</label>
                    <select value={compForm.userId} onChange={e => setCompForm(f => ({ ...f, userId: e.target.value }))}>
                      <option value="">-- Selecionar pessoa --</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>)}
                    </select>
                  </div>
                  <div className="afield"><label>Meta Atingida</label>
                    <select value={compForm.taskTypeId} onChange={e => setCompForm(f => ({ ...f, taskTypeId: e.target.value }))}>
                      <option value="">-- Selecionar meta --</option>
                      {taskTypes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.points} pts)</option>)}
                    </select>
                  </div>
                  <div className="afield"><label>Observação</label><input placeholder="Ex: Superou a meta em 10%..." value={compForm.notes} onChange={e => setCompForm(f => ({ ...f, notes: e.target.value }))} /></div>
                  <button className="btn-admin-action" onClick={submitCompletion}>Enviar para Aprovação</button>
                </div>
              </div>
            )}

            {/* ── PENDENTES ── */}
            {tab === 'pending' && role === 'admin' && (
              <div>
                <h3 className="admin-section-title">Aprovação de Lançamentos</h3>
                {pendingTasks.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Nenhum lançamento aguardando aprovação.</p> : (
                  <table className="admin-table">
                    <thead><tr><th>Pessoa</th><th>Meta</th><th>Pontos</th><th>Data</th><th>Ação</th></tr></thead>
                    <tbody>
                      {pendingTasks.map(p => (
                        <tr key={p.id}>
                          <td>{p.user_name}</td><td>{p.task_name}</td><td>{p.points_awarded} pts</td>
                          <td>{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                          <td>
                            <button className="btn-approve" onClick={() => approveTask(p.id, 'approve')}>✓ Aprovar</button>
                            <button className="btn-reject" onClick={() => approveTask(p.id, 'reject')}>✕ Rejeitar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── LOJA ── */}
            {tab === 'store' && role === 'admin' && (
              <div>
                <h3 className="admin-section-title">Loja: Adicionar Item</h3>
                <div className="admin-form">
                  <div className="afield"><label>Item</label><input placeholder="Nome do item..." value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="afield"><label>Custo (Pontos)</label><input type="number" value={itemForm.costPoints} onChange={e => setItemForm(f => ({ ...f, costPoints: e.target.value }))} /></div>
                  <div className="afield"><label>Estoque</label><input type="number" value={itemForm.stock} onChange={e => setItemForm(f => ({ ...f, stock: e.target.value }))} /></div>
                  <div className="afield">
                    <label>Categoria</label>
                    <select value={itemForm.categoryId} onChange={e => setItemForm(f => ({ ...f, categoryId: e.target.value, newCategory: '' }))}>
                      <option value="">-- Selecionar --</option>
                      {storeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input placeholder="Ou criar nova categoria..." value={itemForm.newCategory} onChange={e => setItemForm(f => ({ ...f, newCategory: e.target.value, categoryId: '' }))} style={{ marginTop: '6px' }} />
                  </div>
                  <button className="btn-admin-action" onClick={submitItem}>Salvar Item</button>
                </div>
                <h3 className="admin-section-title" style={{ marginTop: '2rem' }}>Itens na Loja</h3>
                <table className="admin-table">
                  <thead><tr><th>Nome</th><th>Custo</th><th>Estoque</th><th>Categoria</th></tr></thead>
                  <tbody>{storeItems.map(i => <tr key={i.id}><td>{i.name}</td><td>{i.cost_points} pts</td><td>{i.stock}</td><td>{i.category_name || '—'}</td></tr>)}</tbody>
                </table>
              </div>
            )}

            {/* ── BÔNUS ── */}
            {tab === 'bonuses' && role === 'admin' && (
              <div>
                <h3 className="admin-section-title">Conceder Bônus Manual</h3>
                <div className="admin-form">
                  <div className="afield"><label>Membro</label>
                    <select value={bonusForm.userId} onChange={e => setBonusForm(f => ({ ...f, userId: e.target.value }))}>
                      <option value="">-- Selecionar membro --</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>)}
                    </select>
                  </div>
                  <div className="afield"><label>Pontos</label><input type="number" value={bonusForm.points} onChange={e => setBonusForm(f => ({ ...f, points: e.target.value }))} /></div>
                  <div className="afield"><label>Motivo</label><input value={bonusForm.reason} onChange={e => setBonusForm(f => ({ ...f, reason: e.target.value }))} /></div>
                  <button className="btn-admin-action" onClick={submitBonus}>Conceder</button>
                </div>
              </div>
            )}

            {/* ── RESGATES ── */}
            {tab === 'redemptions' && role === 'admin' && (
              <div>
                <h3 className="admin-section-title">Resgates Solicitados</h3>
                <table className="admin-table">
                  <thead><tr><th>Membro</th><th>Item</th><th>Status</th><th>Ações</th></tr></thead>
                  <tbody>
                    {redemptions.map(r => (
                      <tr key={r.id}>
                        <td>{r.user_name}</td><td>{r.item_name}</td>
                        <td><span className={`status-badge status-${r.status}`}>{r.status}</span></td>
                        <td>{r.status === 'pending' && <button className="btn-approve" onClick={() => fulfillRedemption(r.id)}>✓ Entregue</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── PRÊMIO MENSAL ── */}
            {tab === 'prize' && role === 'admin' && (
              <div>
                <h3 className="admin-section-title">Prêmio Mensal em Destaque</h3>
                <div className="admin-form">
                  <div className="afield"><label>Mês (AAAA-MM)</label><input type="month" value={prizeForm.month} onChange={e => setPrizeForm(f => ({ ...f, month: e.target.value }))} /></div>
                  <div className="afield"><label>Título</label><input value={prizeForm.title} onChange={e => setPrizeForm(f => ({ ...f, title: e.target.value }))} /></div>
                  <div className="afield"><label>Descrição</label><textarea value={prizeForm.description} onChange={e => setPrizeForm(f => ({ ...f, description: e.target.value }))} /></div>
                  <div className="afield"><label>URL da Imagem (opcional)</label><input value={prizeForm.imageUrl} onChange={e => setPrizeForm(f => ({ ...f, imageUrl: e.target.value }))} /></div>
                  <button className="btn-admin-action" onClick={submitPrize}>Salvar</button>
                </div>
              </div>
            )}

            {/* ── INTEGRAÇÕES ── */}
            {tab === 'integrations' && role === 'admin' && (
              <div>
                <h3 className="admin-section-title">Integrações de Sistemas</h3>
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  <div className="admin-form" style={{ borderLeft: '4px solid #fc6c7c', padding: '1.5rem', background: 'var(--bg-card)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ backgroundColor: '#fc6c7c', color: 'white', padding: '0.75rem', borderRadius: '0.75rem', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 'bold' }}>A</div>
                      <div><h4 style={{ margin: 0 }}>Asana</h4><p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sincronize projetos e tarefas do board</p></div>
                    </div>
                    <div className="afield"><label>Personal Access Token</label><input type="password" placeholder="1/12300..." value={asanaToken} onChange={e => setAsanaToken(e.target.value)} /></div>
                    <div className="afield"><label>Workspace ID (Opcional)</label><input placeholder="Ex: 1202622032463666" value={workspaceId} onChange={e => setWorkspaceId(e.target.value)} /></div>
                    <div className="afield" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-hover)', padding: '1rem', borderRadius: '0.75rem' }}>
                      <input type="checkbox" id="asana_auto_sync" checked={autoSync} onChange={e => setAutoSync(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--accent)', cursor: 'pointer' }} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label htmlFor="asana_auto_sync" style={{ cursor: 'pointer', margin: 0 }}>Sincronização Automática</label>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Importar projetos e portfólios ao abrir o app</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                      <button className="btn-admin-action" style={{ background: 'var(--bg-hover)', color: 'var(--text-heading)', border: '1px solid var(--border-color)' }} onClick={handleTestAsana} disabled={isTesting}>
                        {isTesting ? <Loader2 size={16} className="animate-spin" style={{ marginRight: '6px' }} /> : <CheckCircle2 size={16} style={{ marginRight: '6px' }} />}
                        Testar Conexão
                      </button>
                      <button className="btn-admin-action" style={{ paddingLeft: '2rem', paddingRight: '2rem' }} onClick={handleSaveAsana}>Salvar Configuração</button>
                      <button onClick={handleClearAsana} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer', marginLeft: 'auto', textDecoration: 'underline' }}>Desconectar</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;
