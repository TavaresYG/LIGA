import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Target, CheckCircle2, TrendingUp, Award, Users, CheckSquare, Send, AlertCircle } from 'lucide-react';
import '../styles/goals.css';

import BASE_API_URL from '../api/config';
const API_URL = `${BASE_API_URL}/api`;

interface TaskType {
  id: string;
  name: string;
  points: number;
  tipo: string;
  validation_rule_name?: string;
}

interface StatementEntry {
  id: string;
  type: string;
  description: string;
  points: number;
  date: string;
}

interface User {
  id: string;
  name: string;
  username: string;
}

const CHECKLIST_ITEMS = [
  'USAR O PADRÃO CORRETO',
  'REGISTRO DE ALTERAÇÕES',
  'NOME DO APARELHO',
  'CODANA UTILIZADO',
  'VERSÃO DO INFOLAB UTILIZADA',
  'VERSÃO DO VIU UTILIZADO'
];

const GoalsPage: React.FC = () => {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [completions, setCompletions] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('member');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [checkpointScores, setCheckpointScores] = useState<Record<string, number>>({});
  const [launching, setLaunching] = useState(false);
  const [launchMsg, setLaunchMsg] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        
        // Use individual try-catches or selective Promise.all to prevent one failure from killing everything
        const [resTasks, resStatement, resRole, resUsers] = await Promise.all([
          fetch(`${API_URL}/task-types`, { headers }).catch(e => ({ ok: false, error: e })),
          fetch(`${API_URL}/me/statement`, { headers }).catch(e => ({ ok: false, error: e })),
          fetch(`${API_URL}/me/role`, { headers }).catch(e => ({ ok: false, error: e })),
          fetch(`${API_URL}/users`, { headers }).catch(e => ({ ok: false, error: e }))
        ]);

        if (resTasks && 'ok' in resTasks && resTasks.ok) {
          const taskData: TaskType[] = await (resTasks as Response).json();
          setTasks(taskData);
        }

        if (resStatement && 'ok' in resStatement && resStatement.ok) {
          const statementData: StatementEntry[] = await (resStatement as Response).json();
          const counts: Record<string, number> = {};
          statementData.forEach(entry => {
            if (entry.type === 'task') {
              counts[entry.description] = (counts[entry.description] || 0) + 1;
            }
          });
          setCompletions(counts);
        }

        if (resRole && 'ok' in resRole && resRole.ok) {
          const roleData = await (resRole as Response).json();
          setUserRole(roleData.role || 'member');
        }

        if (resUsers && 'ok' in resUsers && resUsers.ok) {
          const userData: User[] = await (resUsers as Response).json();
          setAllUsers(userData);
        }
      } catch (err) {
        console.error('Error in GoalsPage fetchData:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleLaunchPoints = async () => {
    if (!selectedUserId) {
      setLaunchMsg({ text: 'Selecione um membro da equipe.', type: 'error' });
      return;
    }

    if (selectedItems.size === 0) {
      setLaunchMsg({ text: 'Selecione pelo menos um item do manual.', type: 'error' });
      return;
    }

    setLaunching(true);
    setLaunchMsg({ text: '', type: '' });

    const batchCompletions = Array.from(selectedItems).map(itemName => {
      const task = tasks.find(t => t.name === itemName);
      return {
        taskTypeId: task?.id,
        points: checkpointScores[itemName] || 0
      };
    });

    try {
      const res = await fetch(`${API_URL}/task-completions/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedUserId,
          completions: batchCompletions,
          notes: 'Lançamento via Checklist de Manuais'
        })
      });

      if (res.ok) {
        setLaunchMsg({ text: '✅ Pontos lançados com sucesso! Aguardando aprovação.', type: 'success' });
        setSelectedItems(new Set());
        setCheckpointScores({});
        setSelectedUserId('');
      } else {
        const err = await res.json();
        setLaunchMsg({ text: '❌ Erro: ' + (err.error || 'Falha ao lançar'), type: 'error' });
      }
    } catch (err) {
      setLaunchMsg({ text: '❌ Falha na conexão com o servidor', type: 'error' });
    } finally {
      setLaunching(false);
      setTimeout(() => setLaunchMsg({ text: '', type: '' }), 5000);
    }
  };

  const toggleItem = (item: string) => {
    const next = new Set(selectedItems);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    setSelectedItems(next);
  };

  const handleScoreChange = (item: string, val: string) => {
    const score = parseInt(val) || 0;
    setCheckpointScores(prev => ({ ...prev, [item]: score }));
  };

  if (loading) return <div className="loading">Carregando metas...</div>;

  return (
    <div className="goals-page">
      <header className="goals-header">
        <div className="title-area">
          <h1>🎯 Metas Ativas</h1>
          <p>Acompanhe o seu progresso e os pontos disponíveis.</p>
        </div>
      </header>

      {/* MANUAL CHECKLIST PANEL */}
      <div className={`manual-checklist-panel ${userRole === 'member' ? 'checklist-read-only' : ''}`}>
        <div className="panel-header">
          <div className="panel-title">
            <CheckSquare className="panel-icon" size={28} />
            <h2>Checklist de Manuais</h2>
          </div>
          {(userRole === 'admin' || userRole === 'organizador') && (
            <div className="user-selector">
              <Users size={18} color="var(--text-muted)" />
              <label>Membro:</label>
              <select 
                value={selectedUserId} 
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">-- Selecionar --</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="checklist-container">
          {CHECKLIST_ITEMS.map((labelName) => {
            const isSelected = selectedItems.has(labelName);
            const canEdit = userRole === 'admin' || userRole === 'organizador';
            
            return (
              <div 
                key={labelName} 
                className={`checklist-item ${isSelected ? 'selected' : ''}`}
                onClick={() => canEdit && toggleItem(labelName)}
                style={{ cursor: canEdit ? 'pointer' : 'default' }}
              >
                <div className="item-left">
                  {isSelected ? (
                    <CheckCircle2 size={20} color="var(--accent)" />
                  ) : (
                    <div style={{ width: 20, height: 20, border: '2px solid var(--border-color)', borderRadius: '50%', flexShrink: 0 }} />
                  )}
                  <span className="item-label" style={{ color: 'var(--text-main)', display: 'inline-block' }}>
                    {labelName}
                  </span>
                </div>
                
                {canEdit ? (
                  <div className="item-points-input" onClick={e => e.stopPropagation()}>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={checkpointScores[labelName] || ''}
                      onChange={(e) => handleScoreChange(labelName, e.target.value)}
                    />
                    <span>pts</span>
                  </div>
                ) : (
                  <div className="item-points-badge">Ativo</div>
                )}
              </div>
            );
          })}
        </div>

        {(userRole === 'admin' || userRole === 'organizador') && (
          <div className="panel-footer">
            {launchMsg.text && (
              <span className={`launch-msg ${launchMsg.type}`}>
                {launchMsg.text}
              </span>
            )}
            <button 
              className="btn-launch" 
              onClick={handleLaunchPoints}
              disabled={launching}
            >
              <Send size={18} />
              {launching ? 'Enviando...' : 'Registrar Pontos'}
            </button>
          </div>
        )}

        {userRole === 'member' && (
          <div className="panel-footer">
            <span className="launch-msg" style={{ fontStyle: 'italic', opacity: 0.7 }}>
              <AlertCircle size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Itens obrigatórios para a equipe. Solicite o lançamento ao seu líder.
            </span>
          </div>
        )}
      </div>

      <div className="goals-grid">
        {tasks.map(task => {
          const count = completions[task.name] || 0;
          return (
            <div key={task.id} className="goal-card">
              <div className="goal-icon">
                <Target size={24} />
              </div>
              <div className="goal-info">
                <h3>{task.name}</h3>
                <div className="goal-meta">
                  <span className="badge-points">{task.points} pts</span>
                  <span className="badge-type">{task.tipo}</span>
                </div>
                {task.validation_rule_name && (
                  <p className="goal-rule">Regra: <span>{task.validation_rule_name}</span></p>
                )}
              </div>
              <div className="goal-progress">
                <div className="progress-stat">
                  <TrendingUp size={14} />
                  <span>Concluído <strong>{count}</strong> vezes</span>
                </div>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: count > 0 ? '100%' : '5%' }}
                  ></div>
                </div>
                <div className="progress-footer">
                  {count > 0 ? (
                    <span className="status-done"><CheckCircle2 size={12} /> Ativo no Extrato</span>
                  ) : (
                    <span className="status-pending">Aguardando início</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {tasks.length === 0 && (
        <div className="empty-state">
          <Award size={48} />
          <p>Nenhuma meta ativa no momento. Fique de olho!</p>
        </div>
      )}
    </div>
  );
};

export default GoalsPage;
