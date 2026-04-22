import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckSquare, 
  ListTodo, 
  Plus, 
  Trash2, 
  ClipboardCheck, 
  User as UserIcon, 
  Loader2, 
  Award, 
  Calendar as CalendarIcon, 
  LayoutList, 
  ChevronLeft, 
  ChevronRight,
  Building2,
  Clock,
  Users,
  Paperclip,
  Send,
  X as XIcon,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BASE_API_URL from '../api/config';
import '../styles/goals.css';

const API_URL = `${BASE_API_URL}/api`;

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  category: string;
  assigned_to?: string;
  assigned_name?: string;
  due_date?: string;
  portfolio_name?: string;
  created_at: string;
}

interface UserTeam { id: string; name: string; username: string; }
interface Portfolio { id: string; name: string; }

const ChecklistPage: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [users, setUsers] = useState<UserTeam[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [taskTypes, setTaskTypes] = useState<{ id: string; name: string; points: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingPoints, setIsSendingPoints] = useState(false);
  
  const [showPointsForm, setShowPointsForm] = useState(false);
  const [pointsForm, setPointsForm] = useState({ userId: '', taskTypeId: '', notes: '', files: [] as File[] });
  
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const [newItem, setNewItem] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<'Todas' | 'Diário' | 'Semanal' | 'Projeto' | 'Geral'>('Todas');

  const canAssign = true;

  useEffect(() => {
    fetchData();
    fetchUsers();
    fetchPortfolios();
    fetchTaskTypes();
  }, [token]);

  const fetchTaskTypes = async () => {
    try {
      const res = await fetch(`${API_URL}/task-types`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setTaskTypes(data.filter(t => t.active));
    } catch (err) {}
  };

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/checklists`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch (err) {}
  };

  const fetchPortfolios = async () => {
    try {
      const res = await fetch(`${API_URL}/portfolios`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setPortfolios(data);
    } catch (err) {}
  };

  const toggleItem = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`${API_URL}/checklists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ completed: !currentStatus })
      });
      if (res.ok) setItems(items.map(item => item.id === id ? { ...item, completed: !currentStatus } : item));
    } catch (err) {}
  };

  const [repeatType, setRepeatType] = useState<'none' | 'weekly' | 'monthly'>('none');
  const [repeatCount, setRepeatCount] = useState<number>(1);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    setIsSubmitting(true);
    
    // Preparar lista de usuários e nomes
    const selectedUsersData = users.filter(u => selectedUserIds.includes(u.id));
    
    // Debug: Garantir que temos dados
    console.log('Selecionados:', selectedUserIds, 'Dados:', selectedUsersData);

    const finalIds = selectedUserIds.length > 0 ? selectedUserIds.join(',') : (currentUser?.id || '');
    
    // Forçar nome a partir dos dados atuais para garantir envio
    let finalNames = selectedUsersData.map(u => u.name).join(', ');
    if (!finalNames && selectedUserIds.length === 0) finalNames = currentUser?.name || 'Eu';
    if (!finalNames) finalNames = 'Usuário Selecionado';

    const tasksToCreate = [];

    // Base task
    tasksToCreate.push({
      text: newItem,
      category: activeCategory === 'Todas' ? 'Geral' : activeCategory,
      assigned_to: finalIds,
      assigned_name: finalNames,
      due_date: dueDate || null,
      portfolio_name: selectedPortfolio || null
    });

    // Handle recurrence
    if (repeatType !== 'none' && dueDate && repeatCount > 1) {
      const baseDate = new Date(dueDate + 'T12:00:00');
      for (let i = 1; i < repeatCount; i++) {
        const nextDate = new Date(baseDate);
        if (repeatType === 'weekly') nextDate.setDate(baseDate.getDate() + (i * 7));
        else if (repeatType === 'monthly') nextDate.setMonth(baseDate.getMonth() + i);
        
        tasksToCreate.push({
          ...tasksToCreate[0],
          due_date: nextDate.toISOString().split('T')[0]
        });
      }
    }

    try {
      const results = await Promise.all(tasksToCreate.map(async task => {
        const r = await fetch(`${API_URL}/checklists`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(task)
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Erro no servidor');
        return data;
      }));
      
      setItems([...results, ...items]);
      setNewItem(''); setSelectedUserIds([]); setDueDate(''); setSelectedPortfolio('');
      setRepeatType('none'); setRepeatCount(1);
    } catch (err: any) { 
      console.error(err); 
      alert(`Erro ao criar tarefa: ${err.message}`);
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const submitPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pointsForm.userId || !pointsForm.taskTypeId || !token) {
      alert('Selecione o membro e a meta para pontuar.');
      return;
    }
    
    setIsSendingPoints(true);
    const formData = new FormData();
    formData.append('userId', pointsForm.userId);
    formData.append('taskTypeId', pointsForm.taskTypeId);
    formData.append('notes', pointsForm.notes);
    
    pointsForm.files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const res = await fetch(`${API_URL}/task-completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      
      const result = await res.json();
      if (res.ok) {
        alert('✅ Conclusão enviada para aprovação do Admin!');
        setShowPointsForm(false);
        setPointsForm({ userId: '', taskTypeId: '', notes: '', files: [] as File[] });
      } else {
        alert('❌ Erro: ' + (result.error || 'Erro desconhecido'));
      }
    } catch (err) {
      alert('Falha ao conectar com o servidor');
    } finally {
      setIsSendingPoints(false);
    }
  };

  const { permissions } = useAuth();
  const canSendPoints = (permissions || []).includes('adm_points') || (permissions || []).includes('admin_panel');

  const removeItem = async (id: string) => {
    if (!window.confirm('Excluir esta tarefa?')) return;
    try {
      const res = await fetch(`${API_URL}/checklists/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setItems(items.filter(item => item.id !== id));
    } catch (err) {}
  };

  const clearCompleted = async () => {
    if (!window.confirm('Limpar todas as concluídas?')) return;
    try {
      const res = await fetch(`${API_URL}/checklists-all/completed`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) fetchData();
    } catch (err) {}
  };

  const filteredItems = items.filter(item => activeCategory === 'Todas' ? true : item.category === activeCategory);
  const progress = items.length ? Math.round((items.filter(i => i.completed).length / items.length) * 100) : 0;

  // Calendar Helpers
  const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const firstDay = (month: number, year: number) => new Date(year, month, 1).getDay();
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const calendarDays = useMemo(() => {
    const days = [];
    const prevMonthDays = firstDay(currentMonth, currentYear);
    const totalDays = daysInMonth(currentMonth, currentYear);
    
    for (let i = 0; i < prevMonthDays; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);
    return days;
  }, [currentMonth, currentYear]);

  const changeMonth = (val: number) => {
    let newMonth = currentMonth + val;
    let newYear = currentYear;
    if (newMonth > 11) { newMonth = 0; newYear++; }
    if (newMonth < 0) { newMonth = 11; newYear--; }
    setCurrentMonth(newMonth); setCurrentYear(newYear);
  };

  const getDayTasks = (day: number | null) => {
    if (!day) return [];
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return items.filter(it => {
      if (!it.due_date) return false;
      const taskDate = String(it.due_date).split('T')[0];
      return taskDate === dateStr;
    });
  };

  const handleUserToggle = (id: string) => {
    setSelectedUserIds(prev => prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]);
  };

  if (loading) return <div style={{ padding: '2rem' }}>Carregando checklist colaborativo...</div>;

  return (
    <div className="goals-page fade-in" style={{ padding: '2rem' }}>
      <header className="goals-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="goals-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ClipboardCheck size={32} color="var(--accent)" />
            Cronograma e Checklists
          </h1>
          <p className="goals-subtitle">Gerencie prazos e tarefas vinculados aos seus portfólios.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="view-toggle" style={{ background: 'var(--bg-card)', padding: '0.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', display: 'flex', gap: '0.25rem' }}>
            <button onClick={() => setViewMode('list')} style={{ padding: '0.5rem 1rem', borderRadius: '0.6rem', border: 'none', background: viewMode === 'list' ? 'var(--accent)' : 'transparent', color: viewMode === 'list' ? 'white' : 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}>
              <LayoutList size={16} /> Lista
            </button>
            <button onClick={() => setViewMode('calendar')} style={{ padding: '0.5rem 1rem', borderRadius: '0.6rem', border: 'none', background: viewMode === 'calendar' ? 'var(--accent)' : 'transparent', color: viewMode === 'calendar' ? 'white' : 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}>
              <CalendarIcon size={16} /> Calendário
            </button>
          </div>

          <div className="progress-summary-card" style={{ background: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `conic-gradient(var(--accent) ${progress}%, var(--bg-hover) 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800' }}>{progress}%</div>
            </div>
            <p style={{ fontSize: '0.85rem', fontWeight: '700', margin: 0 }}>{items.filter(i => i.completed).length}/{items.length} Concluídos</p>
          </div>

          {canSendPoints && (
            <button 
              onClick={() => setShowPointsForm(true)}
              style={{ padding: '0.75rem 1.25rem', borderRadius: '1rem', border: 'none', background: '#166534', color: 'white', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(22,101,52,0.2)' }}
            >
              <Award size={18} /> Registrar Pontuação
            </button>
          )}
        </div>
      </header>

      <div className="checklist-container" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        
        <form onSubmit={addItem} style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 200px', gap: '1rem', marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Nova tarefa ou compromisso..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              style={{ padding: '0.85rem 1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', background: 'var(--bg-hover)', color: 'var(--text-main)', fontSize: '0.95rem', outline: 'none' }}
            />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: 'var(--bg-hover)', borderRadius: '0.75rem', padding: '0 1rem', border: '1px solid var(--border-color)' }}>
              <Building2 size={16} color="var(--text-muted)" style={{ marginRight: '0.5rem' }} />
              <select value={selectedPortfolio} onChange={e => setSelectedPortfolio(e.target.value)} style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.85rem', width: '100%', outline: 'none' }}>
                <option value="">Portfólio: (Nenhum)</option>
                {portfolios.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: 'var(--bg-hover)', borderRadius: '0.75rem', padding: '0 1rem', border: '1px solid var(--border-color)' }}>
              <Clock size={16} color="var(--text-muted)" style={{ marginRight: '0.5rem' }} />
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.85rem', width: '100%', outline: 'none' }} />
            </div>
          </div>

          {/* Opções de Recorrência */}
          {dueDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1.25rem', background: 'rgba(255,193,7,0.05)', borderRadius: '0.75rem', border: '1px dashed var(--accent)', marginBottom: '1rem', animation: 'fadeIn 0.3s ease' }}>
              <ListTodo size={16} color="var(--accent)" />
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-heading)' }}>Repetir esta tarefa?</span>
              <select 
                value={repeatType} 
                onChange={e => setRepeatType(e.target.value as any)} 
                style={{ padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-page)', fontSize: '0.8rem', color: 'var(--text-main)', cursor: 'pointer' }}
              >
                <option value="none">Não repetir</option>
                <option value="weekly">Semanalmente (Mesmo dia da semana)</option>
                <option value="monthly">Mensalmente (Mesmo dia do mês)</option>
              </select>
              
              {repeatType !== 'none' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>por</span>
                  <input 
                    type="number" 
                    min="2" 
                    max="52" 
                    value={repeatCount} 
                    onChange={e => setRepeatCount(parseInt(e.target.value) || 2)} 
                    style={{ width: '60px', padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-page)', color: 'var(--text-main)', fontWeight: '700', textAlign: 'center' }} 
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ocorrências</span>
                </div>
              )}
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['Todas', 'Geral', 'Diário', 'Semanal', 'Projeto'] as const).map(cat => (
                <button type="button" key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '0.4rem 0.8rem', borderRadius: '0.5rem', border: 'none', background: activeCategory === cat ? 'var(--accent)' : 'var(--bg-hover)', color: activeCategory === cat ? 'white' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', transition: '0.2s' }}>
                  {cat}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '0.6rem', padding: '1rem', background: 'var(--bg-hover)', borderRadius: '1rem', border: '2px solid var(--border-color)', minHeight: '60px' }}>
              <div style={{ width: '100%', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={16} color="var(--accent)" />
                <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-heading)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Atribuir a:</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(Clique para selecionar um ou mais)</span>
              </div>
              {users.map(u => {
                const isSelected = selectedUserIds.includes(u.id);
                return (
                  <div 
                    key={u.id} 
                    onClick={() => handleUserToggle(u.id)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.4rem', 
                      padding: '0.4rem 0.8rem', 
                      borderRadius: '0.75rem', 
                      background: isSelected ? 'var(--accent)' : 'var(--bg-card)', 
                      color: isSelected ? 'white' : 'var(--text-main)', 
                      fontSize: '0.8rem', 
                      fontWeight: '700', 
                      cursor: 'pointer', 
                      border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border-color)'}`, 
                      transition: '0.2s all ease',
                      boxShadow: isSelected ? '0 4px 12px rgba(255,193,7,0.2)' : 'none'
                    }}
                  >
                    {isSelected ? <CheckSquare size={14} /> : <UserIcon size={14} opacity={0.5} />}
                    {u.name}
                  </div>
                );
              })}
            </div>

            <button type="submit" disabled={isSubmitting} style={{ padding: '0.75rem 1.75rem', borderRadius: '1rem', border: 'none', background: 'var(--accent)', color: 'white', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'center' }}>
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Criar Tarefa
            </button>
          </div>
        </form>

        {viewMode === 'list' ? (
          <div className="checklist-items" style={{ background: 'var(--bg-card)', borderRadius: '1.5rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h2 style={{ fontSize: '1rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>{activeCategory}</h2>
               <button onClick={clearCompleted} style={{ fontSize: '0.75rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700' }}>LIMPAR CONCLUÍDAS</button>
            </div>
            {filteredItems.length > 0 ? filteredItems.map(item => (
              <div key={item.id} style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border-color)', background: item.completed ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                <button onClick={() => toggleItem(item.id, item.completed)} style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${item.completed ? 'var(--accent)' : 'var(--border-color)'}`, background: item.completed ? 'var(--accent)' : 'transparent', cursor: 'pointer', color: 'white' }}>
                  {item.completed && <CheckSquare size={16} />}
                </button>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? 'var(--text-muted)' : 'var(--text-heading)' }}>{item.text}</p>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.2rem', fontSize: '0.7rem' }}>
                    {item.portfolio_name && <span style={{ color: 'var(--accent)', fontWeight: '800' }}>#{item.portfolio_name}</span>}
                    {item.due_date && <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#6366f1', fontWeight: '700' }}><Clock size={10} /> {new Date(item.due_date).toLocaleDateString('pt-BR')}</span>}
                    <span style={{ color: 'var(--text-muted)' }}>Assinado para: {item.assigned_name || 'Eu'}</span>
                  </div>
                </div>
                <button onClick={() => removeItem(item.id)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
              </div>
            )) : <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}><ListTodo size={40} style={{ opacity: 0.2, marginBottom: '0.5rem' }} /><p>Sem tarefas nesta categoria.</p></div>}
          </div>
        ) : (
          <div className="calendar-view" style={{ background: 'var(--bg-card)', borderRadius: '1.5rem', border: '1px solid var(--border-color)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800' }}>{monthNames[currentMonth]} {currentYear}</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => changeMonth(-1)} style={{ padding: '0.5rem', borderRadius: '50%', border: '1px solid var(--border-color)', background: 'var(--bg-hover)', cursor: 'pointer' }}><ChevronLeft size={20} /></button>
                <button onClick={() => changeMonth(1)} style={{ padding: '0.5rem', borderRadius: '50%', border: '1px solid var(--border-color)', background: 'var(--bg-hover)', cursor: 'pointer' }}><ChevronRight size={20} /></button>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--border-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', overflow: 'hidden' }}>
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
                <div key={d} style={{ padding: '0.75rem', background: 'var(--bg-hover)', textAlign: 'center', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)' }}>{d}</div>
              ))}
              {calendarDays.map((day, i) => {
                const tasks = getDayTasks(day);
                return (
                  <div key={i} style={{ minHeight: '100px', padding: '0.5rem', background: day === null ? 'rgba(0,0,0,0.02)' : 'var(--bg-card)', position: 'relative' }}>
                    {day && (
                      <>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: tasks.length ? 'var(--accent)' : 'var(--text-muted)' }}>{day}</span>
                        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {tasks.map(t => (
                            <div key={t.id} title={t.text} style={{ padding: '0.2rem 0.4rem', background: t.completed ? 'rgba(0,0,0,0.05)' : 'rgba(255,193,7,0.1)', borderLeft: `3px solid ${t.completed ? '#cbd5e1' : 'var(--accent)'}`, borderRadius: '2px', fontSize: '0.65rem', fontWeight: '700', color: t.completed ? 'var(--text-muted)' : 'var(--text-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.text}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* MODAL DE PONTUAÇÃO */}
      {showPointsForm && (
        <div className="admin-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, position: 'fixed', inset: 0 }}>
          <div className="admin-container" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '2rem', background: 'var(--bg-card)', borderRadius: '1.5rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>Registrar Conclusão / Pontos</h2>
                <button onClick={() => setShowPointsForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><XIcon size={24} /></button>
              </div>
              
              <form onSubmit={submitPoints}>
                <div className="admin-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="afield">
                    <label>Quem receberá esses pontos? <span className="req">*</span></label>
                    <select 
                      value={pointsForm.userId} 
                      onChange={e => setPointsForm({...pointsForm, userId: e.target.value})}
                      required
                    >
                      <option value="">-- Selecionar membro --</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>

                  <div className="afield">
                    <label>Meta atingida? <span className="req">*</span></label>
                    <select 
                      value={pointsForm.taskTypeId} 
                      onChange={e => setPointsForm({...pointsForm, taskTypeId: e.target.value})}
                      required
                    >
                      <option value="">-- Selecionar meta --</option>
                      {taskTypes.map(t => (
                        <option key={t.id} value={t.id} style={{ color: t.points < 0 ? '#ef4444' : 'inherit' }}>
                          {t.points < 0 ? '⚠️ [PENALIDADE] ' : ''}
                          {t.name} ({t.points > 0 ? '+' : ''}{t.points} pts)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="afield">
                    <label>Observações</label>
                    <textarea 
                      placeholder="Ex: Checklist do portfólio X finalizado..." 
                      value={pointsForm.notes} 
                      onChange={e => setPointsForm({...pointsForm, notes: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <div className="afield">
                    <label>Anexar Documentos (PDF)</label>
                    <div style={{ 
                      border: '2px dashed var(--border-color)', 
                      borderRadius: '1rem', 
                      padding: '1rem', 
                      textAlign: 'center',
                      background: 'var(--bg-hover)',
                      position: 'relative'
                    }}>
                      <Paperclip size={24} color="var(--text-muted)" style={{ marginBottom: '0.5rem' }} />
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{pointsForm.files.length > 0 ? `${pointsForm.files.length} arquivo(s) selecionado(s)` : 'Clique para selecionar PDFs'}</p>
                      <input 
                        type="file" 
                        multiple 
                        accept=".pdf"
                        onChange={e => {
                          if (e.target.files) {
                            setPointsForm({ ...pointsForm, files: Array.from(e.target.files) });
                          }
                        }}
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button 
                      type="button" 
                      onClick={() => setShowPointsForm(false)} 
                      style={{ flex: 1, padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', background: 'none', color: 'var(--text-main)', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      disabled={isSendingPoints}
                      style={{ flex: 2, padding: '0.85rem', borderRadius: '0.75rem', border: 'none', background: 'var(--accent)', color: 'white', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                      {isSendingPoints ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                      Enviar para Aprovação
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChecklistPage;
