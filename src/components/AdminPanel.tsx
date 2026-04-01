import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/admin.css';

const API_URL = 'http://localhost:5000/api';

type AdminTab = 'tasks' | 'pending' | 'store' | 'bonuses' | 'redemptions' | 'prize';

interface User { id: string; name: string; username: string; }
interface TaskType { id: string; name: string; points: number; tipo: string; validation_rule_name?: string; }
interface ValidationRule { id: string; name: string; }
interface StoreCategory { id: string; name: string; }
interface Pending { id: string; user_name: string; task_name: string; points_awarded: number; notes: string; created_at: string; }
interface Redemption { id: string; user_name: string; item_name: string; points_spent: number; status: string; created_at: string; }
interface StoreItem { id: string; name: string; cost_points: number; stock: number; category_name: string; image_url?: string; }

const AdminPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { token } = useAuth();
  const [tab, setTab] = useState<AdminTab>('tasks');
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
    Promise.all([
      fetch(`${API_URL}/users`, { headers: h() }),
      fetch(`${API_URL}/task-types`, { headers: h() }),
      fetch(`${API_URL}/validation-rules`, { headers: h() }),
      fetch(`${API_URL}/task-completions/pending`, { headers: h() }),
      fetch(`${API_URL}/store/categories`, { headers: h() }),
      fetch(`${API_URL}/store/items`, { headers: h() }),
      fetch(`${API_URL}/redemptions/all`, { headers: h() }),
    ]).then(async results => {
      const [u, tt, vr, pt, sc, si, rd] = results;
      if (u.ok) setUsers(await u.json());
      if (tt.ok) setTaskTypes(await tt.json());
      if (vr.ok) setValidationRules(await vr.json());
      if (pt.ok) setPendingTasks(await pt.json());
      if (sc.ok) setStoreCategories(await sc.json());
      if (si.ok) setStoreItems(await si.json());
      if (rd.ok) setRedemptions(await rd.json());
    });
  }, [token]);

  // ---- Task Form ----
  const [taskForm, setTaskForm] = useState({ name: '', points: '', tipo: 'Individual', validationRuleId: '', newRule: '' });
  const submitTask = async () => {
    let ruleId = taskForm.validationRuleId;
    if (taskForm.newRule) {
      const { ok, data } = await api('/validation-rules', { method: 'POST', headers: h(), body: JSON.stringify({ name: taskForm.newRule }) });
      if (ok) { setValidationRules(prev => [...prev, data]); ruleId = data.id; }
    }
    const { ok } = await api('/task-types', { method: 'POST', headers: h(), body: JSON.stringify({ name: taskForm.name, points: Number(taskForm.points), tipo: taskForm.tipo, validationRuleId: ruleId || null }) });
    if (ok) { showMsg('✅ Tarefa criada!'); setTaskForm({ name: '', points: '', tipo: 'Individual', validationRuleId: '', newRule: '' }); const res = await fetch(`${API_URL}/task-types`, { headers: h() }); if (res.ok) setTaskTypes(await res.json()); }
    else showMsg('❌ Erro ao criar tarefa');
  };

  // ---- Register Completion ----
  const [compForm, setCompForm] = useState({ userId: '', taskTypeId: '', notes: '' });
  const submitCompletion = async () => {
    const { ok, data } = await api('/task-completions', { method: 'POST', headers: h(), body: JSON.stringify(compForm) });
    ok ? showMsg('✅ Tarefa registrada como pendente!') : showMsg('❌ ' + data.error);
    if (ok) { setCompForm({ userId: '', taskTypeId: '', notes: '' }); const res = await fetch(`${API_URL}/task-completions/pending`, { headers: h() }); if (res.ok) setPendingTasks(await res.json()); }
  };

  // ---- Approve/Reject ----
  const approveTask = async (id: string, action: 'approve' | 'reject') => {
    const { ok } = await api(`/task-completions/${id}/${action}`, { method: 'PUT', headers: h() });
    if (ok) { showMsg(`✅ Tarefa ${action === 'approve' ? 'aprovada' : 'rejeitada'}!`); setPendingTasks(prev => prev.filter(p => p.id !== id)); }
  };

  // ---- Store Item Form ----
  const [itemForm, setItemForm] = useState({ name: '', costPoints: '', stock: '', categoryId: '', notes: '', imageUrl: '', newCategory: '' });
  const submitItem = async () => {
    let catId = itemForm.categoryId;
    if (itemForm.newCategory) {
      const { ok, data } = await api('/store/categories', { method: 'POST', headers: h(), body: JSON.stringify({ name: itemForm.newCategory }) });
      if (ok) { setStoreCategories(prev => [...prev, data]); catId = data.id; }
    }
    const { ok } = await api('/store/items', { method: 'POST', headers: h(), body: JSON.stringify({ name: itemForm.name, costPoints: Number(itemForm.costPoints), stock: Number(itemForm.stock), categoryId: catId || null, notes: itemForm.notes, imageUrl: itemForm.imageUrl || null }) });
    if (ok) { showMsg('✅ Item adicionado à loja!'); setItemForm({ name: '', costPoints: '', stock: '', categoryId: '', notes: '', imageUrl: '', newCategory: '' }); const res = await fetch(`${API_URL}/store/items`, { headers: h() }); if (res.ok) setStoreItems(await res.json()); }
    else showMsg('❌ Erro ao criar item');
  };

  // ---- Bonus Form ----
  const [bonusForm, setBonusForm] = useState({ userId: '', points: '', reason: '' });
  const submitBonus = async () => {
    const { ok } = await api('/bonuses', { method: 'POST', headers: h(), body: JSON.stringify({ userId: bonusForm.userId, points: Number(bonusForm.points), reason: bonusForm.reason }) });
    ok ? showMsg('✅ Bônus concedido!') : showMsg('❌ Erro ao conceder bônus');
    if (ok) setBonusForm({ userId: '', points: '', reason: '' });
  };

  // ---- Prize Form ----
  const [prizeForm, setPrizeForm] = useState({ month: new Date().toISOString().slice(0, 7), title: '', description: '', imageUrl: '' });
  const submitPrize = async () => {
    const { ok } = await api('/featured-prize', { method: 'POST', headers: h(), body: JSON.stringify({ month: prizeForm.month, title: prizeForm.title, description: prizeForm.description, imageUrl: prizeForm.imageUrl || null }) });
    ok ? showMsg('✅ Prêmio mensal atualizado!') : showMsg('❌ Erro ao salvar prêmio');
  };

  const fulfillRedemption = async (id: string) => {
    const { ok } = await api(`/redemptions/${id}/fulfill`, { method: 'PUT', headers: h() });
    if (ok) { showMsg('✅ Entrega confirmada!'); setRedemptions(prev => prev.map(r => r.id === id ? { ...r, status: 'fulfilled' } : r)); }
  };

  const TABS: { key: AdminTab; label: string }[] = [
    { key: 'tasks', label: '📋 Tarefas' },
    { key: 'pending', label: `⏳ Pendentes ${pendingTasks.length > 0 ? `(${pendingTasks.length})` : ''}` },
    { key: 'store', label: '🛍️ Loja' },
    { key: 'bonuses', label: '⭐ Bônus' },
    { key: 'redemptions', label: '📦 Resgates' },
    { key: 'prize', label: '🎁 Prêmio do Mês' },
  ];

  return (
    <div className="admin-overlay">
      <div className="admin-panel">
        <div className="admin-header">
          <h2>⚙️ Painel Administrativo</h2>
          <button onClick={onClose} className="btn-close-admin">✕</button>
        </div>

        {msg && <div className="admin-msg">{msg}</div>}

        <div className="admin-tabs">
          {TABS.map(t => (
            <button key={t.key} className={`admin-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>

        <div className="admin-content">

          {/* TASKS TAB */}
          {tab === 'tasks' && (
            <div>
              <h3 className="admin-section-title">Criar Nova Tarefa</h3>
              <div className="admin-form">
                <div className="afield"><label>Tarefa (Meta)</label><input placeholder="Descrição da meta..." value={taskForm.name} onChange={e => setTaskForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="afield"><label>Pontos</label><input type="number" placeholder="Ex: 100" value={taskForm.points} onChange={e => setTaskForm(f => ({ ...f, points: e.target.value }))} /></div>
                <div className="afield">
                  <label>Tipo</label>
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
                  <input placeholder="Ou crie nova regra..." value={taskForm.newRule} onChange={e => setTaskForm(f => ({ ...f, newRule: e.target.value, validationRuleId: '' }))} style={{ marginTop: '6px' }} />
                </div>
                <button className="btn-admin-action" onClick={submitTask}>+ Criar Tarefa</button>
              </div>
              <h3 className="admin-section-title" style={{ marginTop: '2rem' }}>Registrar Conclusão de Tarefa</h3>
              <div className="admin-form">
                <div className="afield"><label>Membro</label>
                  <select value={compForm.userId} onChange={e => setCompForm(f => ({ ...f, userId: e.target.value }))}>
                    <option value="">-- Selecionar membro --</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>)}
                  </select>
                </div>
                <div className="afield"><label>Tarefa</label>
                  <select value={compForm.taskTypeId} onChange={e => setCompForm(f => ({ ...f, taskTypeId: e.target.value }))}>
                    <option value="">-- Selecionar tarefa --</option>
                    {taskTypes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.points} pts)</option>)}
                  </select>
                </div>
                <div className="afield"><label>Observação (opcional)</label><input placeholder="Detalhes da conclusão..." value={compForm.notes} onChange={e => setCompForm(f => ({ ...f, notes: e.target.value }))} /></div>
                <button className="btn-admin-action" onClick={submitCompletion}>Registrar (Aguardando Aprovação)</button>
              </div>
              <h3 className="admin-section-title" style={{ marginTop: '2rem' }}>Tarefas Cadastradas</h3>
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

          {/* PENDING TAB */}
          {tab === 'pending' && (
            <div>
              <h3 className="admin-section-title">Tarefas Aguardando Aprovação</h3>
              {pendingTasks.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Nenhuma pendência.</p> : (
                <table className="admin-table">
                  <thead><tr><th>Membro</th><th>Tarefa</th><th>Pontos</th><th>Obs</th><th>Data</th><th>Ação</th></tr></thead>
                  <tbody>
                    {pendingTasks.map(p => (
                      <tr key={p.id}>
                        <td>{p.user_name}</td>
                        <td>{p.task_name}</td>
                        <td>{p.points_awarded} pts</td>
                        <td>{p.notes || '—'}</td>
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

          {/* STORE TAB */}
          {tab === 'store' && (
            <div>
              <h3 className="admin-section-title">Adicionar Item à Loja</h3>
              <div className="admin-form">
                <div className="afield"><label>Item</label><input placeholder="Nome do item..." value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="afield"><label>Custo em Pontos</label><input type="number" placeholder="Ex: 500" value={itemForm.costPoints} onChange={e => setItemForm(f => ({ ...f, costPoints: e.target.value }))} /></div>
                <div className="afield"><label>QTD Estoque</label><input type="number" placeholder="Ex: 10" value={itemForm.stock} onChange={e => setItemForm(f => ({ ...f, stock: e.target.value }))} /></div>
                <div className="afield">
                  <label>Faixa (Categoria)</label>
                  <select value={itemForm.categoryId} onChange={e => setItemForm(f => ({ ...f, categoryId: e.target.value, newCategory: '' }))}>
                    <option value="">-- Selecionar --</option>
                    {storeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input placeholder="Ou crie nova faixa..." value={itemForm.newCategory} onChange={e => setItemForm(f => ({ ...f, newCategory: e.target.value, categoryId: '' }))} style={{ marginTop: '6px' }} />
                </div>
                <div className="afield"><label>URL da Foto (opcional)</label><input placeholder="https://..." value={itemForm.imageUrl} onChange={e => setItemForm(f => ({ ...f, imageUrl: e.target.value }))} /></div>
                <div className="afield"><label>Observação</label><textarea placeholder="Descrição do item..." value={itemForm.notes} onChange={e => setItemForm(f => ({ ...f, notes: e.target.value }))} /></div>
                <button className="btn-admin-action" onClick={submitItem}>+ Adicionar à Loja</button>
              </div>
              <h3 className="admin-section-title" style={{ marginTop: '2rem' }}>Itens Cadastrados</h3>
              <table className="admin-table">
                <thead><tr><th>Item</th><th>Custo</th><th>Estoque</th><th>Faixa</th></tr></thead>
                <tbody>
                  {storeItems.map(i => <tr key={i.id}><td>{i.name}</td><td>{i.cost_points} pts</td><td>{i.stock}</td><td>{i.category_name || '—'}</td></tr>)}
                </tbody>
              </table>
            </div>
          )}

          {/* BONUSES TAB */}
          {tab === 'bonuses' && (
            <div>
              <h3 className="admin-section-title">Conceder Bônus de Equipe</h3>
              <div className="admin-form">
                <div className="afield"><label>Membro</label>
                  <select value={bonusForm.userId} onChange={e => setBonusForm(f => ({ ...f, userId: e.target.value }))}>
                    <option value="">-- Selecionar membro --</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>)}
                  </select>
                </div>
                <div className="afield"><label>Pontos de Bônus</label><input type="number" placeholder="Ex: 200" value={bonusForm.points} onChange={e => setBonusForm(f => ({ ...f, points: e.target.value }))} /></div>
                <div className="afield"><label>Motivo</label><input placeholder="Ex: Meta de equipe atingida em Abril" value={bonusForm.reason} onChange={e => setBonusForm(f => ({ ...f, reason: e.target.value }))} /></div>
                <button className="btn-admin-action" onClick={submitBonus}>Conceder Bônus</button>
              </div>
            </div>
          )}

          {/* REDEMPTIONS TAB */}
          {tab === 'redemptions' && (
            <div>
              <h3 className="admin-section-title">Resgates Solicitados</h3>
              <table className="admin-table">
                <thead><tr><th>Membro</th><th>Item</th><th>Pontos</th><th>Status</th><th>Data</th><th>Ação</th></tr></thead>
                <tbody>
                  {redemptions.map(r => (
                    <tr key={r.id}>
                      <td>{r.user_name}</td>
                      <td>{r.item_name}</td>
                      <td>{r.points_spent} pts</td>
                      <td><span className={`status-badge status-${r.status}`}>{r.status}</span></td>
                      <td>{new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
                      <td>{r.status === 'pending' && <button className="btn-approve" onClick={() => fulfillRedemption(r.id)}>✓ Entregar</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PRIZE TAB */}
          {tab === 'prize' && (
            <div>
              <h3 className="admin-section-title">Definir Prêmio Mensal em Destaque</h3>
              <div className="admin-form">
                <div className="afield"><label>Mês</label><input type="month" value={prizeForm.month} onChange={e => setPrizeForm(f => ({ ...f, month: e.target.value }))} /></div>
                <div className="afield"><label>Título do Prêmio</label><input placeholder="Ex: iPhone 16 Pro" value={prizeForm.title} onChange={e => setPrizeForm(f => ({ ...f, title: e.target.value }))} /></div>
                <div className="afield"><label>Descrição</label><textarea placeholder="Detalhes do prêmio..." value={prizeForm.description} onChange={e => setPrizeForm(f => ({ ...f, description: e.target.value }))} /></div>
                <div className="afield"><label>URL da Foto</label><input placeholder="https://..." value={prizeForm.imageUrl} onChange={e => setPrizeForm(f => ({ ...f, imageUrl: e.target.value }))} /></div>
                {prizeForm.imageUrl && <img src={prizeForm.imageUrl} alt="Preview" style={{ width: '120px', borderRadius: '12px', marginTop: '8px' }} onError={e => (e.currentTarget.style.display = 'none')} />}
                <button className="btn-admin-action" onClick={submitPrize}>💾 Salvar Prêmio do Mês</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
