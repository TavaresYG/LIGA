import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Target, 
  Edit3, 
  Clock, 
  Store, 
  Star, 
  Package, 
  Gift, 
  X,
  ChevronRight,
  Settings,
  LayoutDashboard
} from 'lucide-react';
import '../styles/admin.css';

const API_URL = 'http://localhost:5000/api';

type AdminTab = 'meta' | 'registry' | 'pending' | 'store' | 'bonuses' | 'redemptions' | 'prize';

interface User { id: string; name: string; username: string; }
interface TaskType { id: string; name: string; points: number; tipo: string; validation_rule_name?: string; }
interface ValidationRule { id: string; name: string; }
interface StoreCategory { id: string; name: string; }
interface Pending { id: string; user_name: string; task_name: string; points_awarded: number; notes: string; created_at: string; }
interface Redemption { id: string; user_name: string; item_name: string; points_spent: number; status: string; created_at: string; }
interface StoreItem { id: string; name: string; cost_points: number; stock: number; category_name: string; image_url?: string; }

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
  const [msg, setMsg] = useState('');

  const h = (extra = {}) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...extra });
  const api = async (url: string, opts?: RequestInit) => {
    const res = await fetch(`${API_URL}${url}`, opts);
    const data = await res.json();
    return { ok: res.ok, data };
  };
  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

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
    }

    Promise.all(requests).then(async results => {
      const u = results[0];
      const tt = results[1];
      if (u && u.ok) setUsers(await u.json());
      if (tt && tt.ok) setTaskTypes(await tt.json());

      if (role === 'admin') {
        const vr = results[2];
        const pt = results[3];
        const sc = results[4];
        const si = results[5];
        const rd = results[6];
        if (vr && vr.ok) setValidationRules(await vr.json());
        if (pt && pt.ok) setPendingTasks(await pt.json());
        if (sc && sc.ok) setStoreCategories(await sc.json());
        if (si && si.ok) setStoreItems(await si.json());
        if (rd && rd.ok) setRedemptions(await rd.json());
      }
    });
  }, [token, role]);

  // ---- Meta Form (Admin Only) ----
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

  // ---- Register Completion (Organizer or Admin) ----
  const [compForm, setCompForm] = useState({ userId: '', taskTypeId: '', notes: '' });
  const submitCompletion = async () => {
    const { ok, data } = await api('/task-completions', { method: 'POST', headers: h(), body: JSON.stringify(compForm) });
    ok ? showMsg('✅ Conclusão enviada para aprovação!') : showMsg('❌ ' + (data.error || 'Erro ao registrar'));
    if (ok) { setCompForm({ userId: '', taskTypeId: '', notes: '' }); }
  };

  // ---- Approve/Reject (Admin Only) ----
  const approveTask = async (id: string, action: 'approve' | 'reject') => {
    const { ok } = await api(`/task-completions/${id}/${action}`, { method: 'PUT', headers: h() });
    if (ok) { showMsg(`✅ Tarefa ${action === 'approve' ? 'aprovada' : 'rejeitada'}!`); setPendingTasks(prev => prev.filter(p => p.id !== id)); }
  };

  // ---- Store Item Form (Admin Only) ----
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

  // ---- Bonus Form (Admin Only) ----
  const [bonusForm, setBonusForm] = useState({ userId: '', points: '', reason: '' });
  const submitBonus = async () => {
    const { ok } = await api('/bonuses', { method: 'POST', headers: h(), body: JSON.stringify({ userId: bonusForm.userId, points: Number(bonusForm.points), reason: bonusForm.reason }) });
    ok ? showMsg('✅ Bônus concedido!') : showMsg('❌ Erro ao conceder bônus');
    if (ok) setBonusForm({ userId: '', points: '', reason: '' });
  };

  // ---- Prize Form (Admin Only) ----
  const [prizeForm, setPrizeForm] = useState({ month: new Date().toISOString().slice(0, 7), title: '', description: '', imageUrl: '' });
  const submitPrize = async () => {
    const { ok } = await api('/featured-prize', { method: 'POST', headers: h(), body: JSON.stringify({ month: prizeForm.month, title: prizeForm.title, description: prizeForm.description, imageUrl: prizeForm.imageUrl || null }) });
    ok ? showMsg('✅ Prêmio mensal atualizado!') : showMsg('❌ Erro ao salvar prêmio');
  };

  const fulfillRedemption = async (id: string) => {
    const { ok } = await api(`/redemptions/${id}/fulfill`, { method: 'PUT', headers: h() });
    if (ok) { showMsg('✅ Entrega confirmada!'); setRedemptions(prev => prev.map(r => r.id === id ? { ...r, status: 'fulfilled' } : r)); }
  };

  // Filter tabs based on role
  const allTabs: { key: AdminTab; label: string; icon: React.ReactNode; minRole: string }[] = [
    { key: 'meta', label: 'Metas', icon: <Target size={18} />, minRole: 'admin' },
    { key: 'registry', label: 'Lançar Pontos', icon: <Edit3 size={18} />, minRole: 'organizador' },
    { key: 'pending', label: 'Pendentes', icon: <Clock size={18} />, minRole: 'admin' },
    { key: 'store', label: 'Loja', icon: <Store size={18} />, minRole: 'admin' },
    { key: 'bonuses', label: 'Bônus', icon: <Star size={18} />, minRole: 'admin' },
    { key: 'redemptions', label: 'Resgates', icon: <Package size={18} />, minRole: 'admin' },
    { key: 'prize', label: 'Prêmio Mensal', icon: <Gift size={18} />, minRole: 'admin' },
  ];

  const visibleTabs = allTabs.filter(t => {
    if (role === 'admin') return true;
    if (role === 'organizador' && t.key === 'registry') return true;
    return false;
  });

  return (
    <div className="admin-overlay">
      <div className="admin-container">
        
        {/* SIDEBAR */}
        <aside className="admin-sidebar">
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <Settings className="logo-icon" size={24} />
              <div>
                <h1>LIGA Admin</h1>
                <span>{role === 'admin' ? 'Administrador' : 'Organizador'}</span>
              </div>
            </div>
          </div>

          <nav className="sidebar-nav">
            {visibleTabs.map(t => (
              <button 
                key={t.key} 
                className={`sidebar-item ${tab === t.key ? 'active' : ''}`} 
                onClick={() => setTab(t.key)}
              >
                <span className="item-icon">{t.icon}</span>
                <span className="item-label">{t.label}</span>
                {t.key === 'pending' && pendingTasks.length > 0 && (
                  <span className="item-badge">{pendingTasks.length}</span>
                )}
                {tab === t.key && <ChevronRight className="active-arrow" size={14} />}
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <button onClick={onClose} className="btn-logout-sidebar">
              <X size={18} />
              Sair do Painel
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="admin-main">
          <header className="main-header">
            <div className="header-info">
              <LayoutDashboard size={20} />
              <h2>{allTabs.find(t => t.key === tab)?.label}</h2>
            </div>
            <button onClick={onClose} className="btn-close-mobile">
              <X size={20} />
            </button>
          </header>

          {msg && <div className="admin-msg">{msg}</div>}

          <div className="admin-content-area">

          {/* META TAB (Admin only) */}
          {tab === 'meta' && role === 'admin' && (
            <div>
              <h3 className="admin-section-title">Criar Nova Meta de Pontuação</h3>
              <div className="admin-form">
                <div className="afield"><label>Tarefa (Meta)</label><input placeholder="Ex: Meta de 50 envios" value={taskForm.name} onChange={e => setTaskForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="afield"><label>Quantidade de Pontos</label><input type="number" placeholder="Somente números..." value={taskForm.points} onChange={e => setTaskForm(f => ({ ...f, points: e.target.value }))} /></div>
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
                  <input placeholder="Criar novo item para a lista..." value={taskForm.newRule} onChange={e => setTaskForm(f => ({ ...f, newRule: e.target.value, validationRuleId: '' }))} style={{ marginTop: '6px' }} />
                </div>
                <button className="btn-admin-action" onClick={submitTask}>Salvar Meta</button>
              </div>
              
              <h3 className="admin-section-title" style={{ marginTop: '2rem' }}>Metas Atuais</h3>
              <table className="admin-table">
                <thead><tr><th>Nome</th><th>Pontos</th><th>Tipo</th><th>Regra</th></tr></thead>
                <tbody>
                  {taskTypes.map(t => (
                    <tr key={t.id}><td>{t.name}</td><td>{t.points} pts</td><td>{t.tipo}</td><td>{t.validation_rule_name || '—'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* REGISTRY TAB (Organizer or Admin) */}
          {tab === 'registry' && (
            <div>
              <h3 className="admin-section-title">Registrar Conclusão de Meta (Lançar Pontos)</h3>
              <p className="admin-hint">Selecione o membro e a meta atingida. O lançamento ficará pendente de aprovação final.</p>
              <div className="admin-form">
                <div className="afield"><label>Membro (Pessoa)</label>
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
                <div className="afield"><label>Observação / Justificativa</label><input placeholder="Ex: Superou a meta em 10%..." value={compForm.notes} onChange={e => setCompForm(f => ({ ...f, notes: e.target.value }))} /></div>
                <button className="btn-admin-action" onClick={submitCompletion}>Enviar para Aprovação</button>
              </div>
            </div>
          )}

          {/* PENDING TAB (Admin only) */}
          {tab === 'pending' && role === 'admin' && (
            <div>
              <h3 className="admin-section-title">Aprovação de Lançamentos</h3>
              {pendingTasks.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Nenhum lançamento aguardando aprovação.</p> : (
                <table className="admin-table">
                  <thead><tr><th>Pessoa</th><th>Meta</th><th>Pontos</th><th>Data</th><th>Ação</th></tr></thead>
                  <tbody>
                    {pendingTasks.map(p => (
                      <tr key={p.id}>
                        <td>{p.user_name}</td>
                        <td>{p.task_name}</td>
                        <td>{p.points_awarded} pts</td>
                        <td>{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                        <td>
                          <button className="btn-approve" onClick={() => approveTask(p.id, 'approve')}>✓ Aprovar</button>
                          <button className="btn-reject" onClick={() => approveTask(p.id, 'reject')}>✕ Recjeitar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* STORE TAB (Admin Only) */}
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
            </div>
          )}

          {/* BONUS TAB (Admin Only) */}
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

          {/* REDEMPTIONS TAB (Admin Only) */}
          {tab === 'redemptions' && role === 'admin' && (
            <div>
              <h3 className="admin-section-title">Resgates Solicitados</h3>
              <table className="admin-table">
                <thead><tr><th>Membro</th><th>Item</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {redemptions.map(r => (
                    <tr key={r.id}>
                      <td>{r.user_name}</td>
                      <td>{r.item_name}</td>
                      <td><span className={`status-badge status-${r.status}`}>{r.status}</span></td>
                      <td>{r.status === 'pending' && <button className="btn-approve" onClick={() => fulfillRedemption(r.id)}>✓ Entregue</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PRIZE TAB (Admin Only) */}
          {tab === 'prize' && role === 'admin' && (
            <div>
              <h3 className="admin-section-title">Prêmio Mensal</h3>
              <div className="admin-form">
                <div className="afield"><label>Título</label><input value={prizeForm.title} onChange={e => setPrizeForm(f => ({ ...f, title: e.target.value }))} /></div>
                <div className="afield"><label>Descrição</label><textarea value={prizeForm.description} onChange={e => setPrizeForm(f => ({ ...f, description: e.target.value }))} /></div>
                <button className="btn-admin-action" onClick={submitPrize}>Salvar</button>
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
