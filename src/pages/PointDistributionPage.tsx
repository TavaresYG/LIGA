import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckSquare, Send, Users, Plus, Trash2, Award, ClipboardList, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import '../styles/goals.css';

import BASE_API_URL from '../api/config';
const API_URL = `${BASE_API_URL}/api`;

interface DistributionItem {
  id: string;
  name: string;
  points: number;
}

interface User {
  id: string;
  name: string;
  username: string;
}

const PointDistributionPage: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const [items, setItems] = useState<DistributionItem[]>(() => {
    const saved = localStorage.getItem('liga_distribuicao_items');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'USAR O PADRÃO CORRETO', points: 10 },
      { id: '2', name: 'REGISTRO DE ALTERAÇÕES', points: 5 },
      { id: '3', name: 'CODANA UTILIZADO', points: 5 }
    ];
  });

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [customPoints, setCustomPoints] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });

  // New item states
  const [newItemName, setNewItemName] = useState('');
  const [newItemPoints, setNewItemPoints] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    localStorage.setItem('liga_distribuicao_items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (!token) return;
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAllUsers(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [token]);

  const toggleItem = (id: string) => {
    const next = new Set(selectedItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItems(next);
  };

  const handleScoreChange = (id: string, val: string) => {
    const score = parseInt(val) || 0;
    setCustomPoints(prev => ({ ...prev, [id]: score }));
  };

  const addNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const item: DistributionItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newItemName,
      points: newItemPoints
    };
    setItems([...items, item]);
    setNewItemName('');
    setNewItemPoints(0);
    setShowAddForm(false);
  };

  const removeItem = (id: string) => {
    if (window.confirm('Excluir este item do checklist?')) {
      setItems(items.filter(i => i.id !== id));
      const next = new Set(selectedItems);
      next.delete(id);
      setSelectedItems(next);
    }
  };

  const handleRegister = async () => {
    if (!selectedUserId) {
      setMsg({ text: 'Selecione um membro da equipe.', type: 'error' });
      return;
    }
    if (selectedItems.size === 0) {
      setMsg({ text: 'Selecione ao menos um item para pontuar.', type: 'error' });
      return;
    }

    setRegistering(true);
    setMsg({ text: '', type: '' });

    const beneficiary = allUsers.find(u => u.id === selectedUserId);
    
    // We send this as a special entry to the statement
    // Note: The server needs to handle these "manual" types if not using taskTypeId
    // For now, we'll try to use the batch completion logic with notes
    const batchData = Array.from(selectedItems).map(itemId => {
      const item = items.find(i => i.id === itemId);
      return {
        description: item?.name,
        points: customPoints[itemId] !== undefined ? customPoints[itemId] : item?.points,
        type: 'manual'
      };
    });

    try {
      // We will use a dedicated endpoint or the statement endpoint directly
      const res = await fetch(`${API_URL}/admin/manual-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedUserId,
          entries: batchData
        })
      });

      if (res.ok) {
        setMsg({ text: `✅ Pontos registrados com sucesso para ${beneficiary?.name}!`, type: 'success' });
        setSelectedItems(new Set());
        setCustomPoints({});
        setSelectedUserId('');
      } else {
        setMsg({ text: '❌ Erro ao registrar pontos no servidor.', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: '❌ Falha na conexão.', type: 'error' });
    } finally {
      setRegistering(false);
      setTimeout(() => setMsg({ text: '', type: '' }), 6000);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Carregando membros da equipe...</div>;

  return (
    <div className="goals-page fade-in" style={{ padding: '2rem' }}>
      <header className="goals-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="goals-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Award size={32} color="var(--accent)" />
            Distribuição de Pontos
          </h1>
          <p className="goals-subtitle">Personalize o checklist e registre pontos para os membros da equipe.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
           <div className="user-selector" style={{ background: 'var(--bg-card)', padding: '0.75rem 1.25rem', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Users size={20} color="var(--accent)" />
              <select 
                value={selectedUserId} 
                onChange={(e) => setSelectedUserId(e.target.value)}
                style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: '600', outline: 'none', cursor: 'pointer' }}
              >
                <option value="">-- Selecionar Membro --</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>
                ))}
              </select>
           </div>
           
           <button 
             onClick={() => setShowAddForm(!showAddForm)}
             className="btn-add-project"
             style={{ padding: '0.75rem 1.25rem', borderRadius: '1rem', background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
           >
             <Plus size={18} /> Personalizar Itens
           </button>
        </div>
      </header>

      {showAddForm && (
        <form onSubmit={addNewItem} className="fade-in" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid var(--accent)', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Nome do Item</label>
            <input 
              type="text" 
              placeholder="Ex: Entrega de Documentação Técnica"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Pontuação Base</label>
            <input 
              type="number" 
              value={newItemPoints}
              onChange={(e) => setNewItemPoints(parseInt(e.target.value) || 0)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
            />
          </div>
          <button type="submit" className="btn-add-project" style={{ height: '45px', background: 'var(--accent)', color: 'white', border: 'none' }}>
            Salvar Item
          </button>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: '1.5rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ClipboardList size={22} color="var(--accent)" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800' }}>Checklist de Distribuição</h2>
            </div>
            {selectedItems.size > 0 && (
              <span style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: '700' }}>{selectedItems.size} selecionados</span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1px', background: 'var(--border-color)' }}>
            {items.map((item) => {
              const isSelected = selectedItems.has(item.id);
              return (
                <div 
                  key={item.id} 
                  style={{ 
                    background: isSelected ? 'rgba(255,193,7,0.05)' : 'var(--bg-card)',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onClick={() => toggleItem(item.id)}
                >
                  <div style={{ 
                    width: '30px', 
                    height: '30px', 
                    borderRadius: '50%', 
                    border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border-color)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isSelected ? 'var(--accent)' : 'transparent',
                    color: 'white',
                    flexShrink: 0
                  }}>
                    {isSelected && <CheckCircle2 size={18} />}
                  </div>

                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: holds(isSelected) ? '700' : '500', color: isSelected ? 'var(--text-heading)' : 'var(--text-main)', fontSize: '1rem' }}>
                      {item.name}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                    <input 
                      type="number" 
                      value={customPoints[item.id] !== undefined ? customPoints[item.id] : item.points}
                      onChange={(e) => handleScoreChange(item.id, e.target.value)}
                      style={{ width: '60px', padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-hover)', color: 'var(--text-main)', textAlign: 'center', fontWeight: '700' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>pts</span>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '0.5rem' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-hover)' }}>
             {msg.text ? (
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: msg.type === 'success' ? 'var(--accent)' : 'var(--danger)', fontWeight: '700' }}>
                 <CheckCircle2 size={18} /> {msg.text}
               </div>
             ) : (
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                 <AlertCircle size={16} /> Selecione os itens acima para registrar.
               </div>
             )}

             <button 
               className="btn-add-project"
               onClick={handleRegister}
               disabled={registering}
               style={{ padding: '1rem 2.5rem', borderRadius: '1.25rem', background: 'var(--accent)', color: 'white', border: 'none', boxShadow: '0 8px 20px rgba(255,193,7,0.3)', minWidth: '220px' }}
             >
               {registering ? <Loader2 size={20} className="animate-spin" /> : <><Send size={20} /> Registrar Pontos</>}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple helper for style logic
function holds(bool: boolean) { return bool; }

export default PointDistributionPage;
