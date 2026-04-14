import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckSquare, Send, Users, Plus, Trash2, Award, ClipboardList, CheckCircle2, Loader2, AlertCircle, ChevronRight, FileCheck } from 'lucide-react';
import '../styles/goals.css';

import BASE_API_URL from '../api/config';
const API_URL = `${BASE_API_URL}/api`;

interface DistributionItem {
  id: string;
  name: string;
  points: number;
}

interface ChecklistGroup {
  id: string;
  title: string;
  items: DistributionItem[];
}

interface User {
  id: string;
  name: string;
  username: string;
}

const PointDistributionPage: React.FC = () => {
  const { token } = useAuth();
  const [groups, setGroups] = useState<ChecklistGroup[]>(() => {
    const saved = localStorage.getItem('liga_distribuicao_groups');
    return saved ? JSON.parse(saved) : [
      { 
        id: 'group1', 
        title: 'Termo de Aceite (Soluções)', 
        items: [
          { id: '1-1', name: 'Documento Assinado', points: 50 },
          { id: '1-2', name: 'Checklist de Verificação', points: 10 }
        ] 
      },
      { 
        id: 'group2', 
        title: 'Termo de Aceite (Treinamento)', 
        items: [
          { id: '2-1', name: 'Presença Confirmada', points: 20 },
          { id: '2-2', name: 'Material Entregue', points: 10 }
        ] 
      },
      { 
        id: 'group3', 
        title: 'Manual de Configuração', 
        items: [
          { id: '3-1', name: 'Padrão LIGA Aplicado', points: 15 },
          { id: '3-2', name: 'Registro de Alterações', points: 5 }
        ] 
      }
    ];
  });

  const [activeGroupId, setActiveGroupId] = useState<string>(groups[0]?.id || '');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<Record<string, string>>({});
  const [selectedItems, setSelectedItems] = useState<Record<string, Set<string>>>({});
  const [customPoints, setCustomPoints] = useState<Record<string, number>>({});
  
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' | ''; groupId: string }>({ text: '', type: '', groupId: '' });

  // New Group/Item states
  const [newGroupName, setNewGroupName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemPoints, setNewItemPoints] = useState(0);
  const [showAddGroup, setShowAddGroup] = useState(false);

  useEffect(() => {
    localStorage.setItem('liga_distribuicao_groups', JSON.stringify(groups));
  }, [groups]);

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

  const toggleItem = (groupId: string, itemId: string) => {
    const next = { ...selectedItems };
    if (!next[groupId]) next[groupId] = new Set();
    
    if (next[groupId].has(itemId)) next[groupId].delete(itemId);
    else next[groupId].add(itemId);
    
    setSelectedItems(next);
  };

  const handleScoreChange = (itemId: string, val: string) => {
    const score = parseInt(val) || 0;
    setCustomPoints(prev => ({ ...prev, [itemId]: score }));
  };

  const addGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const newGroup: ChecklistGroup = {
      id: Math.random().toString(36).substr(2, 9),
      title: newGroupName,
      items: []
    };
    setGroups([...groups, newGroup]);
    setNewGroupName('');
    setShowAddGroup(false);
    setActiveGroupId(newGroup.id);
  };

  const addItemToGroup = (groupId: string) => {
    if (!newItemName.trim()) return;
    const item: DistributionItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newItemName,
      points: newItemPoints
    };
    setGroups(groups.map(g => g.id === groupId ? { ...g, items: [...g.items, item] } : g));
    setNewItemName('');
    setNewItemPoints(0);
  };

  const removeGroup = (groupId: string) => {
    if (window.confirm('Excluir todo este checklist?')) {
      setGroups(groups.filter(g => g.id !== groupId));
      if (activeGroupId === groupId) setActiveGroupId(groups[0]?.id || '');
    }
  };

  const removeItem = (groupId: string, itemId: string) => {
    setGroups(groups.map(g => 
      g.id === groupId ? { ...g, items: g.items.filter(i => i.id !== itemId) } : g
    ));
  };

  const handleRegister = async (groupId: string) => {
    const userId = selectedUserId[groupId];
    const itemsSelected = selectedItems[groupId];

    if (!userId) {
      setMsg({ text: 'Selecione um membro da equipe.', type: 'error', groupId });
      return;
    }
    if (!itemsSelected || itemsSelected.size === 0) {
      setMsg({ text: 'Selecione ao menos um item.', type: 'error', groupId });
      return;
    }

    setRegistering(groupId);
    setMsg({ text: '', type: '', groupId: '' });

    const group = groups.find(g => g.id === groupId);
    const batchData = Array.from(itemsSelected).map(itemId => {
      const item = group?.items.find(i => i.id === itemId);
      return {
        description: `[${group?.title}] ${item?.name}`,
        points: customPoints[itemId] !== undefined ? customPoints[itemId] : item?.points,
        type: 'manual'
      };
    });

    try {
      const res = await fetch(`${API_URL}/admin/manual-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, entries: batchData })
      });

      if (res.ok) {
        setMsg({ text: '✅ Pontos registrados com sucesso!', type: 'success', groupId });
        const nextItems = { ...selectedItems };
        nextItems[groupId] = new Set();
        setSelectedItems(nextItems);
        setSelectedUserId({ ...selectedUserId, [groupId]: '' });
      } else {
        setMsg({ text: '❌ Erro no registro.', type: 'error', groupId });
      }
    } catch (err) {
      setMsg({ text: '❌ Falha na conexão.', type: 'error', groupId });
    } finally {
      setRegistering(null);
      setTimeout(() => setMsg({ text: '', type: '', groupId: '' }), 5000);
    }
  };

  const activeGroup = groups.find(g => g.id === activeGroupId);

  if (loading) return <div style={{ padding: '2rem' }}>Carregando seletor de equipe...</div>;

  return (
    <div className="goals-page fade-in" style={{ padding: '2rem' }}>
      <header className="goals-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="goals-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Award size={32} color="var(--accent)" />
            Distribuição de Pontos LIGA
          </h1>
          <p className="goals-subtitle">Gerencie múltiplos checklists de entrega e distribua pontos para o time.</p>
        </div>
        
        <button 
          onClick={() => setShowAddGroup(!showAddGroup)}
          className="btn-add-project"
          style={{ padding: '0.75rem 1.5rem', borderRadius: '1rem', background: 'var(--accent)', color: 'white', border: 'none' }}
        >
          <Plus size={18} /> Novo Checklist
        </button>
      </header>

      {showAddGroup && (
        <form onSubmit={addGroup} className="fade-in" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid var(--accent)', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Nome do Novo Checklist</label>
            <input 
              type="text" 
              autoFocus
              placeholder="Ex: Checklist de Treinamento"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
            />
          </div>
          <button type="submit" className="btn-add-project" style={{ height: '45px', background: 'var(--accent)', color: 'white', border: 'none' }}>
            Criar Grupo
          </button>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2rem' }}>
        {/* Menu Lateral de Checklists */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '1px' }}>Checklists Ativos</h4>
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => setActiveGroupId(g.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: activeGroupId === g.id ? 'var(--accent)' : 'var(--bg-card)',
                color: activeGroupId === g.id ? 'white' : 'var(--text-main)',
                fontWeight: activeGroupId === g.id ? '700' : '500',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <ClipboardList size={18} />
                 <span style={{ fontSize: '0.9rem' }}>{g.title}</span>
              </div>
              {activeGroupId === g.id && <ChevronRight size={16} />}
            </button>
          ))}
        </nav>

        {/* Área Principal do Checklist Selecionado */}
        <main>
          {activeGroup ? (
            <div className="fade-in" style={{ background: 'var(--bg-card)', borderRadius: '1.5rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-hover)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <FileCheck size={24} color="var(--accent)" />
                  <h2 style={{ fontSize: '1.3rem', fontWeight: '800' }}>{activeGroup.title}</h2>
                </div>
                <button 
                  onClick={() => removeGroup(activeGroup.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}
                >
                  <Trash2 size={14} style={{ display: 'inline', marginRight: '4px' }} /> Excluir Checklist
                </button>
              </div>

              {/* Seletor de Membro INTEGRADO */}
              <div style={{ padding: '1.5rem', background: 'rgba(255,193,7,0.03)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Users size={20} color="var(--accent)" />
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Quem receberá esses pontos?</label>
                  <select 
                    value={selectedUserId[activeGroup.id] || ''} 
                    onChange={(e) => setSelectedUserId({ ...selectedUserId, [activeGroup.id]: e.target.value })}
                    style={{ width: '100%', maxWidth: '400px', padding: '0.6rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.6rem', color: 'var(--text-main)', fontWeight: '600' }}
                  >
                    <option value="">-- Selecionar Membro da Equipe --</option>
                    {allUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lista de Itens */}
              <div style={{ padding: '0.5rem' }}>
                {activeGroup.items.length > 0 ? (
                  activeGroup.items.map(item => {
                    const isSelected = selectedItems[activeGroup.id]?.has(item.id);
                    return (
                      <div 
                        key={item.id} 
                        style={{ 
                          padding: '1rem 1.25rem',
                          margin: '0.5rem',
                          borderRadius: '1rem',
                          background: isSelected ? 'rgba(255,193,7,0.08)' : 'var(--bg-card)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          border: `1px solid ${isSelected ? 'var(--accent)' : 'transparent'}`,
                          cursor: 'pointer'
                        }}
                        onClick={() => toggleItem(activeGroup.id, item.id)}
                      >
                         <div style={{ 
                            width: '26px', 
                            height: '26px', 
                            borderRadius: '50%', 
                            border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border-color)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isSelected ? 'var(--accent)' : 'transparent',
                            color: 'white'
                          }}>
                            {isSelected && <CheckCircle2 size={16} />}
                          </div>
                          
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: isSelected ? '700' : '500', color: 'var(--text-main)' }}>{item.name}</p>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                            <input 
                              type="number" 
                              value={customPoints[item.id] !== undefined ? customPoints[item.id] : item.points}
                              onChange={(e) => handleScoreChange(item.id, e.target.value)}
                              style={{ width: '60px', padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-hover)', color: 'var(--text-main)', textAlign: 'center', fontWeight: '700' }}
                            />
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>pts</span>
                            <button onClick={() => removeItem(activeGroup.id, item.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '0.5rem' }}>
                               <Trash2 size={16} />
                            </button>
                          </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <ClipboardList size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <p>Adicione itens a este checklist abaixo.</p>
                  </div>
                )}
              </div>

              {/* Adicionar Novo Item ao grupo ativo */}
              <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'var(--bg-hover)' }}>
                 <input 
                   type="text" 
                   placeholder="Nome do novo item..." 
                   value={newItemName}
                   onChange={(e) => setNewItemName(e.target.value)}
                   style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: '0.6rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                 />
                 <input 
                   type="number" 
                   placeholder="Pts"
                   value={newItemPoints || ''}
                   onChange={(e) => setNewItemPoints(parseInt(e.target.value) || 0)}
                   style={{ width: '70px', padding: '0.6rem', borderRadius: '0.6rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                 />
                 <button 
                   onClick={() => addItemToGroup(activeGroup.id)}
                   className="btn-add-project" 
                   style={{ padding: '0.6rem 1rem', borderRadius: '0.6rem', background: 'var(--bg-card)', color: 'var(--text-main)', boxShadow: 'none', border: '1px solid var(--border-color)' }}
                 >
                   <Plus size={16} /> Add Item
                 </button>
              </div>

              {/* Registro Final */}
              <div style={{ padding: '1.5rem', borderTop: '2px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
                 {msg.groupId === activeGroup.id && msg.text && (
                   <div style={{ color: msg.type === 'success' ? 'var(--accent)' : 'var(--danger)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={18} /> {msg.text}
                   </div>
                 )}
                 <div style={{ flex: 1 }}></div>
                 <button 
                    disabled={!!registering}
                    onClick={() => handleRegister(activeGroup.id)}
                    className="btn-add-project"
                    style={{ padding: '1rem 3rem', borderRadius: '1.5rem', background: 'var(--accent)', color: 'white', border: 'none', fontWeight: '800', fontSize: '1.1rem', boxShadow: '0 8px 15px rgba(255,193,7,0.3)' }}
                 >
                   {registering === activeGroup.id ? <Loader2 className="animate-spin" /> : <><Send size={20} /> Registrar Pontuação</>}
                 </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: '1.5rem', border: '1px dashed var(--border-color)' }}>
              Selecione ou crie um checklist para começar.
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default PointDistributionPage;
