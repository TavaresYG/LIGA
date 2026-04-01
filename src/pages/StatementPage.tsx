import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/statement.css';

const API_URL = 'http://localhost:5000/api';

interface StatementEntry {
  id: string;
  type: 'task' | 'bonus' | 'redemption';
  description: string;
  points: number;
  date: string;
  notes?: string;
}

const typeConfig = {
  task: { label: 'Tarefa', icon: '✅', color: '#16a34a', bg: 'rgba(34,197,94,0.08)' },
  bonus: { label: 'Bônus', icon: '⭐', color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
  redemption: { label: 'Resgate', icon: '🛍️', color: '#ef4444', bg: 'rgba(239,68,68,0.06)' },
};

const StatementPage: React.FC = () => {
  const { token } = useAuth();
  const [entries, setEntries] = useState<StatementEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'task' | 'bonus' | 'redemption'>('all');

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/me/statement`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setEntries(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const filtered = filter === 'all' ? entries : entries.filter(e => e.type === filter);

  const totalEarned = entries.filter(e => e.points > 0).reduce((s, e) => s + e.points, 0);
  const totalSpent  = entries.filter(e => e.points < 0).reduce((s, e) => s + Math.abs(e.points), 0);
  const balance     = totalEarned - totalSpent;

  return (
    <div className="statement-page">
      <div className="statement-header">
        <div>
          <h1 className="statement-title">📊 Extrato de Pontos</h1>
          <p className="statement-subtitle">Histórico completo e transparente de movimentações</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="statement-summary">
        <div className="summary-card earned">
          <span className="summary-icon">📈</span>
          <div>
            <span className="summary-label">Total ganho</span>
            <span className="summary-value">+{totalEarned.toLocaleString()} pts</span>
          </div>
        </div>
        <div className="summary-card spent">
          <span className="summary-icon">🛍️</span>
          <div>
            <span className="summary-label">Total resgatado</span>
            <span className="summary-value">-{totalSpent.toLocaleString()} pts</span>
          </div>
        </div>
        <div className="summary-card balance">
          <span className="summary-icon">💰</span>
          <div>
            <span className="summary-label">Saldo atual</span>
            <span className="summary-value">{balance.toLocaleString()} pts</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="statement-filters">
        {[
          { key: 'all', label: 'Tudo' },
          { key: 'task', label: '✅ Tarefas' },
          { key: 'bonus', label: '⭐ Bônus' },
          { key: 'redemption', label: '🛍️ Resgates' },
        ].map(f => (
          <button
            key={f.key}
            className={`filter-btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key as any)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Statement List */}
      <div className="statement-card">
        {loading ? (
          <div className="statement-empty">Carregando extrato...</div>
        ) : filtered.length === 0 ? (
          <div className="statement-empty">
            <span style={{ fontSize: '2.5rem' }}>📭</span>
            <p>Nenhuma movimentação encontrada.</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Complete tarefas ou resgate itens para ver o extrato aqui.</p>
          </div>
        ) : (
          filtered.map((entry) => {
            const cfg = typeConfig[entry.type];
            return (
              <div key={entry.id} className="statement-row" style={{ borderLeft: `3px solid ${cfg.color}` }}>
                <div className="statement-icon" style={{ background: cfg.bg, color: cfg.color }}>
                  {cfg.icon}
                </div>
                <div className="statement-info">
                  <span className="statement-desc">{entry.description}</span>
                  <div className="statement-meta">
                    <span className="statement-type-badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    <span className="statement-date">
                      {new Date(entry.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {entry.notes && entry.type !== 'redemption' && (
                      <span className="statement-notes">📎 {entry.notes}</span>
                    )}
                  </div>
                </div>
                <div className={`statement-points ${entry.points > 0 ? 'positive' : 'negative'}`}>
                  {entry.points > 0 ? '+' : ''}{entry.points.toLocaleString()} pts
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default StatementPage;
