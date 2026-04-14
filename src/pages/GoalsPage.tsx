import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Target, CheckCircle2, TrendingUp, Award, Users, User, ChevronDown } from 'lucide-react';
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
  status?: string;
}

interface TeamUser {
  id: string;
  name: string;
  username: string;
}

const GoalsPage: React.FC = () => {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [completions, setCompletions] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadingUser, setLoadingUser] = useState(false);
  const [userRole, setUserRole] = useState<string>('member');
  const [allUsers, setAllUsers] = useState<TeamUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUserName, setSelectedUserName] = useState<string>('');

  const isManagerial = userRole === 'admin' || userRole === 'organizador';

  useEffect(() => {
    if (!token) return;

    const fetchInitial = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };

        const [resTasks, resRole] = await Promise.all([
          fetch(`${API_URL}/task-types`, { headers }),
          fetch(`${API_URL}/me/role`, { headers }),
        ]);

        if (resTasks.ok) setTasks(await resTasks.json());
        
        if (resRole.ok) {
          const roleData = await resRole.json();
          const role = roleData.role || 'member';
          setUserRole(role);

          // If member: load own completions immediately
          if (role === 'member') {
            const resStmt = await fetch(`${API_URL}/me/statement`, { headers });
            if (resStmt.ok) buildCompletions(await resStmt.json());
          } else {
            // Admin/Org: load user list
            const resUsers = await fetch(`${API_URL}/users`, { headers });
            if (resUsers.ok) setAllUsers(await resUsers.json());
          }
        }
      } catch (err) {
        console.error('GoalsPage error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();
  }, [token]);

  const buildCompletions = (statement: StatementEntry[]) => {
    const counts: Record<string, number> = {};
    statement.forEach(entry => {
      if (entry.type === 'task') {
        counts[entry.description] = (counts[entry.description] || 0) + 1;
      }
    });
    setCompletions(counts);
  };

  const loadUserCompletions = async (userId: string) => {
    if (!userId) { setCompletions({}); setSelectedUserName(''); return; }
    setLoadingUser(true);
    try {
      const res = await fetch(`${API_URL}/users/${userId}/statement`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) buildCompletions(await res.json());
      const u = allUsers.find(u => u.id === userId);
      setSelectedUserName(u ? u.name : '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUser(false);
    }
  };

  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
    loadUserCompletions(userId);
  };

  if (loading) return <div className="loading">Carregando metas...</div>;

  return (
    <div className="goals-page">
      <header className="goals-header">
        <div className="title-area">
          <h1>🎯 Metas Ativas</h1>
          <p>
            {isManagerial
              ? 'Selecione um membro para visualizar o progresso individual nas metas.'
              : 'Acompanhe o seu progresso e os pontos disponíveis.'}
          </p>
        </div>
      </header>

      {/* Seletor de membro — visível apenas para Admin e Organizador */}
      {isManagerial && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '1rem',
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', fontWeight: '700' }}>
            <Users size={20} />
            <span>Visualizar progresso de:</span>
          </div>

          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            minWidth: '220px',
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.75rem',
            padding: '0.5rem 1rem',
          }}>
            <User size={16} color="var(--text-muted)" style={{ marginRight: '0.5rem', flexShrink: 0 }} />
            <select
              value={selectedUserId}
              onChange={e => handleUserChange(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--text-main)',
                fontSize: '0.95rem',
                fontWeight: '600',
                width: '100%',
                cursor: 'pointer'
              }}
            >
              <option value="">— Selecione um membro —</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>
              ))}
            </select>
          </div>

          {selectedUserName && (
            <div style={{
              padding: '0.5rem 1rem',
              background: 'var(--accent-light, rgba(22,163,74,0.1))',
              borderRadius: '0.75rem',
              fontSize: '0.85rem',
              fontWeight: '700',
              color: 'var(--accent)',
              border: '1px solid var(--accent)',
            }}>
              👤 {selectedUserName}
            </div>
          )}

          {loadingUser && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Carregando...</span>
          )}
        </div>
      )}

      {/* Lista de metas — para membros sempre visível, para admin/org só após selecionar */}
      {(!isManagerial || selectedUserId) ? (
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
                    <span>Concluído <strong>{count}</strong> {count === 1 ? 'vez' : 'vezes'}</span>
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

          {tasks.length === 0 && (
            <div className="empty-state">
              <Award size={48} />
              <p>Nenhuma meta ativa no momento.</p>
            </div>
          )}
        </div>
      ) : (
        /* Estado vazio — admin não selecionou membro ainda */
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          color: 'var(--text-muted)',
          background: 'var(--bg-card)',
          borderRadius: '1.25rem',
          border: '1px dashed var(--border-color)'
        }}>
          <Users size={56} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>Selecione um membro acima</p>
          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>para visualizar o progresso individual nas metas.</p>
        </div>
      )}
    </div>
  );
};

export default GoalsPage;
