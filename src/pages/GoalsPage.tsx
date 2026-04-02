import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Target, CheckCircle2, TrendingUp, Award } from 'lucide-react';
import '../styles/goals.css';

const API_URL = 'http://localhost:5000/api';

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

const GoalsPage: React.FC = () => {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [completions, setCompletions] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const [resTasks, resStatement] = await Promise.all([
          fetch(`${API_URL}/task-types`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/me/statement`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (resTasks.ok && resStatement.ok) {
          const taskData: TaskType[] = await resTasks.json();
          const statementData: StatementEntry[] = await resStatement.json();

          setTasks(taskData);

          // Count completions per task type
          const counts: Record<string, number> = {};
          statementData.forEach(entry => {
            if (entry.type === 'task') {
              // We match by description (name) since statement doesn't have task_type_id directly
              // In a real scenario, we'd want the ID in the statement
              counts[entry.description] = (counts[entry.description] || 0) + 1;
            }
          });
          setCompletions(counts);
        }
      } catch (err) {
        console.error('Error fetching goals:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (loading) return <div className="loading">Carregando metas...</div>;

  return (
    <div className="goals-page">
      <header className="goals-header">
        <div className="title-area">
          <h1>🎯 Metas Ativas</h1>
          <p>Acompanhe o seu progresso e os pontos disponíveis.</p>
        </div>
      </header>

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
