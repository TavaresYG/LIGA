import React, { useState, useEffect } from 'react';
import { CheckSquare, ListTodo, Plus, Trash2, ClipboardCheck, AlertCircle, User, Loader2, Award } from 'lucide-react';
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
  created_at: string;
}

interface UserTeam {
  id: string;
  name: string;
  username: string;
}

const ChecklistPage: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [users, setUsers] = useState<UserTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newItem, setNewItem] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<'Todas' | 'Diário' | 'Semanal' | 'Projeto' | 'Geral'>('Todas');

  const canAssign = currentUser?.username === 'Yuri.Tavares' || true; // Admins/Orgs can assign

  useEffect(() => {
    fetchData();
    if (canAssign) fetchUsers();
  }, [token]);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/checklists`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
    }
  };

  const toggleItem = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`${API_URL}/checklists/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ completed: !currentStatus })
      });
      if (res.ok) {
        setItems(items.map(item => item.id === id ? { ...item, completed: !currentStatus } : item));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    
    setIsSubmitting(true);
    const beneficiary = users.find(u => u.id === selectedUser);

    try {
      const res = await fetch(`${API_URL}/checklists`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          text: newItem,
          category: activeCategory === 'Todas' ? 'Geral' : activeCategory,
          assigned_to: selectedUser || currentUser?.id,
          assigned_name: beneficiary ? beneficiary.name : currentUser?.name
        })
      });
      
      if (res.ok) {
        const added = await res.json();
        setItems([added, ...items]);
        setNewItem('');
        setSelectedUser('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeItem = async (id: string) => {
    if (!window.confirm('Excluir esta tarefa?')) return;
    try {
      const res = await fetch(`${API_URL}/checklists/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setItems(items.filter(item => item.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const clearCompleted = async () => {
    if (window.confirm('Deseja remover todas as tarefas concluídas?')) {
      try {
        const res = await fetch(`${API_URL}/checklists-all/completed`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) fetchData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredItems = items.filter(item => 
    activeCategory === 'Todas' ? true : item.category === activeCategory
  );

  const completedCount = items.filter(i => i.completed).length;
  const progress = items.length ? Math.round((completedCount / items.length) * 100) : 0;

  if (loading) return <div style={{ padding: '2rem' }}>Carregando checklist colaborativo...</div>;

  return (
    <div className="goals-page fade-in" style={{ padding: '2rem' }}>
      <header className="goals-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="goals-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ClipboardCheck size={32} color="var(--accent)" />
            Checklist da Equipe
          </h1>
          <p className="goals-subtitle">Gerencie e acompanhe as tarefas semanais do time LIGA.</p>
        </div>
        
        <div className="progress-summary-card" style={{ background: 'var(--bg-card)', padding: '1rem 1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div className="progress-circle-mini" style={{ width: '60px', height: '60px', borderRadius: '50%', background: `conic-gradient(var(--accent) ${progress}%, var(--bg-hover) 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
             <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: '800' }}>
               {progress}%
             </div>
          </div>
          <div>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Resumo Geral</h3>
            <p style={{ fontSize: '1.1rem', fontWeight: '700' }}>{completedCount} de {items.length} concluídos</p>
          </div>
        </div>
      </header>

      <div className="checklist-container" style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem' }}>
        <aside className="checklist-sidebar">
          <div style={{ position: 'sticky', top: '2rem' }}>
            <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>Filtros</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(['Todas', 'Diário', 'Semanal', 'Projeto', 'Geral'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    textAlign: 'left',
                    background: activeCategory === cat ? 'var(--accent)' : 'transparent',
                    color: activeCategory === cat ? 'white' : 'var(--text-main)',
                    fontWeight: activeCategory === cat ? '700' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,193,7,0.1)', borderRadius: '0.75rem', border: '1px solid rgba(255,193,7,0.2)' }}>
               <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#B45309', marginBottom: '0.5rem' }}>
                 <Award size={16} />
                 <strong style={{ fontSize: '0.85rem' }}>Gestão Colaborativa</strong>
               </div>
               <p style={{ fontSize: '0.8rem', color: '#B45309', lineHeight: '1.4' }}>
                 Membros da equipe veem apenas suas tarefas. Admins veem tudo.
               </p>
            </div>
          </div>
        </aside>

        <main className="checklist-main">
          <form onSubmit={addItem} style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="Qual tarefa deseja delegar?"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                style={{
                  flex: 1,
                  padding: '1rem 1.5rem',
                  borderRadius: '1rem',
                  border: '2px solid var(--border-color)',
                  background: 'var(--bg-hover)',
                  color: 'var(--text-main)',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-hover)', padding: '0.5rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                <User size={18} color="var(--text-muted)" />
                <select 
                  value={selectedUser} 
                  onChange={(e) => setSelectedUser(e.target.value)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.9rem', width: '100%', outline: 'none' }}
                >
                  <option value="">Atribuir a: (Para mim)</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '0.75rem 2rem',
                  borderRadius: '1rem',
                  border: 'none',
                  background: 'var(--accent)',
                  color: 'white',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(255,193,7,0.3)'
                }}
              >
                {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />} Criar Tarefa
              </button>
            </div>
          </form>

          <div className="checklist-items" style={{ background: 'var(--bg-card)', borderRadius: '1.25rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>
                {activeCategory} {activeCategory === 'Todas' ? 'Tarefas' : ''}
              </h2>
              <button 
                onClick={clearCompleted}
                style={{ fontSize: '0.85rem', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}
              >
                Limpar Concluídas
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <div 
                    key={item.id} 
                    style={{ 
                      padding: '1rem 1.5rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1rem',
                      borderBottom: '1px solid var(--border-color)',
                      background: item.completed ? 'rgba(0,0,0,0.02)' : 'transparent',
                    }}
                  >
                    <button 
                      onClick={() => toggleItem(item.id, item.completed)}
                      style={{ 
                        width: '26px', 
                        height: '26px', 
                        borderRadius: '6px', 
                        border: `2px solid ${item.completed ? 'var(--accent)' : 'var(--border-color)'}`,
                        background: item.completed ? 'var(--accent)' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}
                    >
                      {item.completed && <CheckSquare size={18} />}
                    </button>
                    
                    <div style={{ flex: 1 }}>
                      <p style={{ 
                        margin: 0, 
                        fontSize: '1rem', 
                        color: item.completed ? 'var(--text-muted)' : 'var(--text-heading)',
                        textDecoration: item.completed ? 'line-through' : 'none',
                        fontWeight: item.completed ? '400' : '500'
                      }}>
                        {item.text}
                      </p>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: '700', textTransform: 'uppercase' }}>
                          {item.category}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <User size={10} /> {item.assigned_name || 'Individual'}
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={() => removeItem(item.id)}
                      style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <ListTodo size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                  <p>Nenhuma tarefa delegada encontrada.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ChecklistPage;
