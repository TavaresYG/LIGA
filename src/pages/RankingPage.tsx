import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/ranking.css';

const API_URL = 'http://localhost:5000/api';

type Period = 'geral' | 'semanal' | 'mensal' | 'custom';

interface RankingEntry {
  position: number;
  id: string;
  name: string;
  username: string;
  taskPoints: number;
  bonusPoints: number;
  totalRedeemed: number;
  balance: number;
}

interface TopUser {
  id: string;
  name: string;
  username: string;
  points: number;
}

interface FeaturedPrize {
  title: string;
  description: string;
  image_url?: string;
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const RankingPage: React.FC = () => {
  const { token } = useAuth();
  const [period, setPeriod] = useState<Period>('geral');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [topWeekly, setTopWeekly] = useState<TopUser | null>(null);
  const [topMonthly, setTopMonthly] = useState<TopUser | null>(null);
  const [prize, setPrize] = useState<FeaturedPrize | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRanking = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      let url = `${API_URL}/ranking?period=${period}`;
      if (period === 'custom' && from && to) url += `&from=${from}&to=${to}`;
      const [rankRes, weekRes, monthRes, prizeRes] = await Promise.all([
        fetch(url, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/ranking/top-weekly`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/ranking/top-monthly`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/featured-prize`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (rankRes.ok) setRanking(await rankRes.json());
      if (weekRes.ok) setTopWeekly(await weekRes.json());
      if (monthRes.ok) setTopMonthly(await monthRes.json());
      if (prizeRes.ok) setPrize(await prizeRes.json());
    } finally {
      setLoading(false);
    }
  }, [token, period, from, to]);

  useEffect(() => {
    fetchRanking();
    const interval = setInterval(fetchRanking, 30000); // real-time every 30s
    return () => clearInterval(interval);
  }, [fetchRanking]);

  const top3 = ranking.slice(0, 3);
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;

  return (
    <div className="ranking-page">

      {/* Featured Prize Banner */}
      {prize && (
        <div className="featured-prize-banner">
          <div className="prize-glow" />
          <div className="prize-content">
            {prize.image_url && <img src={prize.image_url} alt="Prêmio" className="prize-img" />}
            <div className="prize-text">
              <span className="prize-label">🎁 Prêmio do Mês</span>
              <h2 className="prize-title">{prize.title}</h2>
              {prize.description && <p className="prize-desc">{prize.description}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Podium Section */}
      <div className="podium-section">
        <h2 className="section-title">🏆 Pódio</h2>
        <div className="podium-wrapper">
          {podiumOrder.map((entry, i) => {
            const isFirst = entry.position === 1;
            const isSecond = entry.position === 2;
            const isWeeklyTop = topWeekly?.id === entry.id;
            const isMonthlyTop = topMonthly?.id === entry.id;
            return (
              <div key={entry.id} className={`podium-card pos-${entry.position} ${isFirst ? 'is-first' : ''}`}>
                <div className="crown-area">
                  {isMonthlyTop && <span className="crown gold-crown" title="TOP 1 do Mês">👑</span>}
                  {isWeeklyTop && !isMonthlyTop && <span className="crown silver-crown" title="TOP 1 da Semana">🥈</span>}
                </div>
                <div className="podium-avatar" style={{ background: getAvatarColor(entry.name) }}>
                  {getInitials(entry.name)}
                </div>
                <div className="podium-name">{entry.name.split(' ')[0]}</div>
                <div className="podium-points">{entry.balance.toLocaleString()} pts</div>
                <div className={`podium-block block-${entry.position}`}>
                  <span className="podium-pos">#{entry.position}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Period Filter */}
      <div className="period-bar">
        {(['geral','semanal','mensal','custom'] as Period[]).map(p => (
          <button
            key={p}
            className={`period-btn ${period === p ? 'active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            {p === 'geral' ? '📊 Geral' : p === 'semanal' ? '📅 Esta Semana' : p === 'mensal' ? '🗓️ Este Mês' : '🔍 Personalizado'}
          </button>
        ))}
        {period === 'custom' && (
          <div className="custom-date">
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            <span>até</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} />
            <button className="period-btn active" onClick={fetchRanking}>Filtrar</button>
          </div>
        )}
      </div>

      {/* Leaderboard Table */}
      <div className="leaderboard-card">
        <div className="leaderboard-header">
          <h3>Classificação Completa</h3>
          <span className="live-badge">🟢 Ao Vivo</span>
        </div>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando ranking...</div>
        ) : (
          <div className="leaderboard-table-wrap">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Posição</th>
                  <th>Pessoa</th>
                  <th>Pts da Semana</th>
                  <th>Bônus Equipe</th>
                  <th>Resgates</th>
                  <th>Saldo Atual</th>
                </tr>
              </thead>
              <tbody>
                {ranking.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhum dado encontrado para este período.</td></tr>
                ) : ranking.map(entry => (
                  <tr key={entry.id} className={entry.position <= 3 ? `top-row pos${entry.position}` : ''}>
                    <td>
                      <div className="pos-badge">
                        {entry.position === 1 && topMonthly?.id === entry.id ? <span className="crown gold-crown">👑</span> :
                         entry.position === 1 && topWeekly?.id === entry.id ? <span className="crown silver-crown">🥈</span> :
                         `#${entry.position}`}
                      </div>
                    </td>
                    <td>
                      <div className="user-cell">
                        <div className="mini-avatar" style={{ background: getAvatarColor(entry.name) }}>{getInitials(entry.name)}</div>
                        <div>
                          <span className="user-name">{entry.name}</span>
                          <span className="user-handle">@{entry.username}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className="pts-week">{entry.taskPoints.toLocaleString()} pts</span></td>
                    <td><span className="pts-bonus">+{entry.bonusPoints.toLocaleString()} pts</span></td>
                    <td><span className="pts-redeemed">-{entry.totalRedeemed.toLocaleString()} pts</span></td>
                    <td><span className="pts-balance">{entry.balance.toLocaleString()} pts</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RankingPage;
