import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckSquare, Send, Users, Plus, Trash2, Award, ClipboardList, CheckCircle2, Loader2, FileCheck } from 'lucide-react';
import '../styles/goals.css';

import BASE_API_URL from '../api/config';
const API_URL = `${BASE_API_URL}/api`;

interface DistributionItem {
  id: string;
  name: string;
  points: number;   // Reward
  penalty: number;  // Loss
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
          { id: '1-1', name: 'Documento Assinado', points: 50, penalty: -10 },
          { id: '1-2', name: 'Checklist de Verificação', points: 10, penalty: -5 }
        ] 
      }
    ];
  });

  const [activeGroupId, setActiveGroupId] = useState<string>(groups[0]?.id || '');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<Record<string, string>>({});
  const [manualNames, setManualNames] = useState<Record<string, string>>({});
  const [selectedItems, setSelectedItems] = useState<Record<string, Set<string>>>({});
  const [customPoints, setCustomPoints] = useState<Record<string, Record<string, number>>>({}); 
  const [attachments, setAttachments] = useState<Record<string, File[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' | ''; groupId: string }>({ text: '', type: '', groupId: '' });

  const [newGroupName, setNewGroupName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemPoints, setNewItemPoints] = useState(0);
  const [newItemPenalty, setNewItemPenalty] = useState(0);
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
    const newSet = new Set(next[groupId]);
    if (newSet.has(itemId)) newSet.delete(itemId);
    else newSet.add(itemId);
    next[groupId] = newSet;
    setSelectedItems(next);
  };

  const handleScoreChange = (itemId: string, type: 'points' | 'penalty', val: string) => {
    const score = parseInt(val) || 0;
    setCustomPoints(prev => ({ 
      ...prev, 
      [itemId]: { ...(prev[itemId] || {}), [type]: score } 
    }));
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
      points: newItemPoints,
      penalty: newItemPenalty
    };
    setGroups(groups.map(g => g.id === groupId ? { ...g, items: [...g.items, item] } : g));
    setNewItemName('');
    setNewItemPoints(0);
    setNewItemPenalty(0);
  };

  const removeGroup = (groupId: string) => {
    if (window.confirm('Excluir todo este checklist?')) {
      const nextGroups = groups.filter(g => g.id !== groupId);
      setGroups(nextGroups);
      if (activeGroupId === groupId) setActiveGroupId(nextGroups[0]?.id || '');
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
    if (!group) return;

    const manualName = manualNames[groupId] || 'Não especificado';

    let totalPoints = 0;
    let details = `Checklist: ${group.title}\nManual: ${manualName}\n\n`;
    
    group.items.forEach(item => {
      const isChecked = itemsSelected.has(item.id);
      const points = Number(customPoints[item.id]?.points ?? item.points ?? 0);
      const penalty = Number(customPoints[item.id]?.penalty ?? item.penalty ?? 0);
      
      if (isChecked) {
        totalPoints += points;
        details += `✅ ${item.name}: +${points} pts\n`;
      } else {
        totalPoints += penalty;
        details += `❌ ${item.name}: ${penalty} pts\n`;
      }
    });

    if (isNaN(totalPoints)) totalPoints = 0;

    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('notes', details);
    formData.append('points', totalPoints.toString());
    
    const groupFiles = attachments[groupId] || [];
    groupFiles.forEach(file => { formData.append('files', file); });

    try {
      const res = await fetch(`${API_URL}/task-completions/manual`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        setMsg({ text: '✅ Checklist enviado para aprovação!', type: 'success', groupId });
        const nextItems = { ...selectedItems };
        nextItems[groupId] = new Set();
        setSelectedItems(nextItems);
        setSelectedUserId({ ...selectedUserId, [groupId]: '' });
        setManualNames({ ...manualNames, [groupId]: '' });
        setAttachments({ ...attachments, [groupId]: [] });
      } else {
        const err = await res.json();
        setMsg({ text: `❌ Erro: ${err.error || 'Erro no registro'}`, type: 'error', groupId });
      }
    } catch (err) {
      setMsg({ text: '❌ Falha na conexão.', type: 'error', groupId });
    } finally {
      setRegistering(null);
      setTimeout(() => setMsg({ text: '', type: '', groupId: '' }), 5000);
    }
  };

  const activeGroup = groups.find(g => g.id === activeGroupId);
  const filteredItems = activeGroup?.items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading) return <div style={{ padding: '2rem' }}>Carregando seletor de equipe...</div>;

  return (
    <div className="goals-page fade-in" style={{ padding: '2rem' }}>
      <header className="goals-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="goals-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.75rem' }}>
            <Award size={28} color="var(--accent)" />
            Distribuição de Pontos
          </h1>
          <p className="goals-subtitle">Selecione os critérios cumpridos para gerar a pontuação do time.</p>
        </div>
        
        <button 
          onClick={() => setShowAddGroup(!showAddGroup)}
          className="btn-add-project"
          style={{ padding: '0.6rem 1.25rem', borderRadius: '0.75rem', background: 'var(--accent)', color: 'white', border: 'none', fontSize: '0.9rem' }}
        >
          <Plus size={18} /> Novo Checklist
        </button>
      </header>

      {showAddGroup && (
        <form onSubmit={addGroup} className="fade-in" style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--accent)', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Nome do Novo Checklist</label>
            <input 
              type="text" 
              autoFocus
              placeholder="Ex: Checklist de Treinamento"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '0.6rem', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
            />
          </div>
          <button type="submit" className="btn-add-project" style={{ height: '40px', background: 'var(--accent)', color: 'white', border: 'none' }}>
            Criar
          </button>
        </form>
      )}

      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <nav style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <h4 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>Checklists</h4>
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => { setActiveGroupId(g.id); setSearchTerm(''); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem',
                borderRadius: '0.6rem',
                border: 'none',
                background: activeGroupId === g.id ? 'var(--accent)' : 'var(--bg-card)',
                color: activeGroupId === g.id ? 'white' : 'var(--text-main)',
                fontWeight: activeGroupId === g.id ? '700' : '500',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                fontSize: '0.85rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                 <ClipboardList size={16} style={{ flexShrink: 0 }} />
                 <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.title}</span>
              </div>
            </button>
          ))}
        </nav>

        <main style={{ flex: 1 }}>
          {activeGroup ? (
            <div className="fade-in" style={{ background: 'var(--bg-card)', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-hover)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileCheck size={20} color="var(--accent)" />
                  <h2 style={{ fontSize: '1.1rem', fontWeight: '800' }}>{activeGroup.title}</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text"
                      placeholder="Buscar item..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ padding: '0.4rem 0.75rem', borderRadius: '2rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.8rem', width: '150px' }}
                    />
                  </div>
                  <button onClick={() => removeGroup(activeGroup.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}>
                    <Trash2 size={12} /> Excluir
                  </button>
                </div>
              </div>

              <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(255,193,7,0.02)', borderBottom: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1.5', minWidth: '200px' }}>
                  <Users size={18} color="var(--text-muted)" />
                  <select 
                    value={selectedUserId[activeGroup.id] || ''} 
                    onChange={(e) => setSelectedUserId({ ...selectedUserId, [activeGroup.id]: e.target.value })}
                    style={{ flex: 1, padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: '600' }}
                  >
                    <option value="">-- Selecionar Usuário --</option>
                    {allUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '2', minWidth: '250px' }}>
                  <Plus size={18} color="var(--text-muted)" />
                  <input 
                    type="text"
                    placeholder="Nome do Manual/Projeto..."
                    value={manualNames[activeGroup.id] || ''}
                    onChange={(e) => setManualNames({ ...manualNames, [activeGroup.id]: e.target.value })}
                    style={{ flex: 1, padding: '0.5rem 0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>
                    <CheckSquare size={14} />
                    {attachments[activeGroup.id]?.length ? `${attachments[activeGroup.id].length} PDF(s)` : 'Anexar PDF'}
                    <input 
                      type="file" multiple accept=".pdf" 
                      onChange={e => { if (e.target.files) setAttachments({ ...attachments, [activeGroup.id]: Array.from(e.target.files) }); }}
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ padding: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '0.5rem', maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
                {filteredItems.length > 0 ? (
                  filteredItems.map(item => {
                    const isSelected = selectedItems[activeGroup.id]?.has(item.id);
                    return (
                      <div 
                        key={item.id} 
                        style={{ padding: '0.6rem 0.8rem', borderRadius: '0.6rem', background: isSelected ? 'rgba(255,193,7,0.08)' : 'var(--bg-hover)', display: 'flex', alignItems: 'center', gap: '0.75rem', border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border-color)'}`, cursor: 'pointer', transition: 'all 0.15s ease' }}
                        onClick={() => toggleItem(activeGroup.id, item.id)}
                      >
                        <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--text-muted)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? 'var(--accent)' : 'transparent', color: 'white', flexShrink: 0 }}>
                          {isSelected && <CheckCircle2 size={14} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.85rem', fontWeight: isSelected ? '700' : '500', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>{item.name}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={e => e.stopPropagation()}>
                          <input 
                            type="number" 
                            value={customPoints[item.id]?.points !== undefined ? customPoints[item.id].points : item.points}
                            onChange={(e) => handleScoreChange(item.id, 'points', e.target.value)}
                            style={{ width: '42px', padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--accent)', textAlign: 'center', fontSize: '0.75rem', fontWeight: '800' }}
                          />
                          <input 
                            type="number" 
                            value={customPoints[item.id]?.penalty !== undefined ? customPoints[item.id].penalty : item.penalty}
                            onChange={(e) => handleScoreChange(item.id, 'penalty', e.target.value)}
                            style={{ width: '42px', padding: '0.25rem', borderRadius: '4px', border: '1px solid #ef444433', background: 'var(--bg-card)', color: '#ef4444', textAlign: 'center', fontSize: '0.75rem', fontWeight: '800' }}
                          />
                          <button onClick={() => removeItem(activeGroup.id, item.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.5 }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ gridColumn: '1/-1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p>{searchTerm ? 'Nenhum item encontrado.' : 'Este checklist está vazio.'}</p>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-hover)' }}>
                <div style={{ padding: '0.75rem 1.25rem', display: 'flex', gap: '0.6rem', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                  <input 
                    type="text" placeholder="Novo item..." value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addItemToGroup(activeGroup.id)}
                    style={{ flex: 1, padding: '0.4rem 0.75rem', borderRadius: '0.4rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                  />
                  <input type="number" placeholder="+ pts" value={newItemPoints || ''} onChange={(e) => setNewItemPoints(parseInt(e.target.value) || 0)} style={{ width: '50px', padding: '0.4rem', borderRadius: '0.4rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', textAlign: 'center', fontSize: '0.8rem' }} />
                  <input type="number" placeholder="- pts" value={newItemPenalty || ''} onChange={(e) => setNewItemPenalty(parseInt(e.target.value) || 0)} style={{ width: '50px', padding: '0.4rem', borderRadius: '0.4rem', border: '1px solid #ef444433', background: 'var(--bg-card)', color: '#ef4444', textAlign: 'center', fontSize: '0.8rem' }} />
                  <button onClick={() => addItemToGroup(activeGroup.id)} style={{ padding: '0.4rem 0.75rem', borderRadius: '0.4rem', background: 'var(--accent)', color: 'white', border: 'none' }}><Plus size={16} /></button>
                </div>

                <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.85rem' }}>
                    {msg.groupId === activeGroup.id && msg.text && (
                      <span style={{ color: msg.type === 'success' ? '#16a34a' : '#ef4444', fontWeight: '700' }}>{msg.text}</span>
                    )}
                  </div>
                  <button 
                    disabled={!!registering}
                    onClick={() => handleRegister(activeGroup.id)}
                    className="btn-add-project"
                    style={{ padding: '0.75rem 2rem', borderRadius: '0.75rem', background: 'var(--accent)', color: 'white', border: 'none', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
                  >
                    {registering === activeGroup.id ? <Loader2 className="animate-spin" size={18} /> : <><Send size={18} /> Registrar Tudo</>}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: '1rem', border: '1px dashed var(--border-color)' }}>
              <CheckSquare size={48} style={{ marginBottom: '1.5rem', opacity: 0.2 }} />
              <p>Selecione um checklist na lateral para começar.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default PointDistributionPage;
