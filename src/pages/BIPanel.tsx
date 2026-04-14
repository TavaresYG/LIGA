import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import {
  BarChart2, PieChart as PieIcon, TrendingUp, Activity,
  Plus, Trash2, Settings, RefreshCw, ChevronDown, Users,
  Trophy, Target, ShoppingBag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BASE_API_URL from '../api/config';

const API_URL = `${BASE_API_URL}/api`;

const PALETTE = ['#16a34a','#22c55e','#4ade80','#86efac','#bbf7d0','#f59e0b','#3b82f6','#8b5cf6','#ec4899','#ef4444'];

type ChartType = 'bar' | 'line' | 'area' | 'pie';
type DataSource = 'ranking' | 'goals' | 'redemptions' | 'checklist';

interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  source: DataSource;
  color: string;
}

interface RankingEntry { name: string; total_points: number; username: string; }
interface TaskType { id: string; name: string; points: number; }

const DATA_SOURCES: { id: DataSource; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'ranking',     label: 'Pontuação Geral',      icon: <Trophy size={18} />,      desc: 'Total de pontos por membro' },
  { id: 'goals',       label: 'Metas da Equipe',      icon: <Target size={18} />,      desc: 'Quantidade de vezes concluída por meta' },
  { id: 'redemptions', label: 'Resgates da Loja',     icon: <ShoppingBag size={18} />, desc: 'Pontos gastos em resgates' },
  { id: 'checklist',   label: 'Checklist da Equipe',  icon: <Activity size={18} />,    desc: 'Tarefas concluídas vs pendentes' },
];

const CHART_TYPES: { id: ChartType; label: string; icon: React.ReactNode }[] = [
  { id: 'bar',  label: 'Barras',  icon: <BarChart2 size={16} /> },
  { id: 'line', label: 'Linha',   icon: <TrendingUp size={16} /> },
  { id: 'area', label: 'Área',    icon: <Activity size={16} /> },
  { id: 'pie',  label: 'Pizza',   icon: <PieIcon size={16} /> },
];

const BIPanel: React.FC = () => {
  const { token } = useAuth();
  const [charts, setCharts] = useState<ChartConfig[]>(() => {
    const saved = localStorage.getItem('liga-bi-charts');
    return saved ? JSON.parse(saved) : [];
  });
  const [rawData, setRawData] = useState<Record<DataSource, any[]>>({
    ranking: [], goals: [], redemptions: [], checklist: []
  });
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [newChart, setNewChart] = useState<Omit<ChartConfig, 'id'>>({
    title: '', type: 'bar', source: 'ranking', color: PALETTE[0]
  });

  useEffect(() => {
    if (!token) return;
    fetchAllData();
  }, [token]);

  useEffect(() => {
    localStorage.setItem('liga-bi-charts', JSON.stringify(charts));
  }, [charts]);

  const fetchAllData = async () => {
    setLoading(true);
    const h = { Authorization: `Bearer ${token}` };
    try {
      const [resRanking, resGoals, resRedemptions, resChecklist] = await Promise.all([
        fetch(`${API_URL}/ranking`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/task-types`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/redemptions/all`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/checklists`, { headers: h }).catch(() => null),
      ]);

      const ranking: RankingEntry[] = resRanking?.ok ? await resRanking.json() : [];
      const goals: TaskType[] = resGoals?.ok ? await resGoals.json() : [];
      const redemptions: any[] = resRedemptions?.ok ? await resRedemptions.json() : [];
      const checklist: any[] = resChecklist?.ok ? await resChecklist.json() : [];

      setRawData({
        ranking:     ranking.slice(0, 10).map(r => ({ name: r.name?.split(' ')[0] || r.username, value: r.total_points })),
        goals:       goals.map(g => ({ name: g.name.length > 20 ? g.name.slice(0, 18) + '…' : g.name, value: g.points })),
        redemptions: buildRedemptionData(redemptions),
        checklist:   buildChecklistData(checklist),
      });
    } catch (err) {
      console.error('BIPanel fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const buildRedemptionData = (data: any[]) => {
    const grouped: Record<string, number> = {};
    data.forEach(r => {
      grouped[r.item_name] = (grouped[r.item_name] || 0) + (r.points_spent || 0);
    });
    return Object.entries(grouped).map(([name, value]) => ({
      name: name.length > 18 ? name.slice(0, 16) + '…' : name, value
    }));
  };

  const buildChecklistData = (data: any[]) => {
    const done = data.filter(c => c.completed).length;
    const pending = data.filter(c => !c.completed).length;
    return [
      { name: 'Concluídas', value: done },
      { name: 'Pendentes', value: pending },
    ];
  };

  const addChart = () => {
    if (!newChart.title.trim()) return;
    const chart: ChartConfig = { ...newChart, id: Math.random().toString(36).slice(2) };
    setCharts(prev => [...prev, chart]);
    setNewChart({ title: '', type: 'bar', source: 'ranking', color: PALETTE[0] });
    setShowBuilder(false);
  };

  const removeChart = (id: string) => {
    if (window.confirm('Remover este gráfico?')) setCharts(prev => prev.filter(c => c.id !== id));
  };

  const renderChart = (cfg: ChartConfig) => {
    const data = rawData[cfg.source];
    const color = cfg.color;

    if (!data || data.length === 0) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '220px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Sem dados disponíveis
        </div>
      );
    }

    const commonProps = {
      data,
      margin: { top: 10, right: 20, left: 0, bottom: 40 }
    };

    if (cfg.type === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(props) => `${props.name ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip formatter={(v: any) => [v, 'Valor']} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (cfg.type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} angle={-30} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={{ fill: color, r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (cfg.type === 'area') {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id={`grad-${cfg.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} angle={-30} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
            <Area type="monotone" dataKey="value" stroke={color} fill={`url(#grad-${cfg.id})`} strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    // Default: bar
    return (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} angle={-30} textAnchor="end" interval={0} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
          <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
          <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <BarChart2 size={32} color="var(--accent)" /> Painel BI
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Crie gráficos personalizados com os dados da sua equipe.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={fetchAllData}
            title="Atualizar dados"
            style={{ padding: '0.625rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
          <button
            onClick={() => setShowBuilder(true)}
            style={{ padding: '0.625rem 1.25rem', background: 'var(--accent)', border: 'none', borderRadius: '0.75rem', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', fontSize: '0.875rem', boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}
          >
            <Plus size={18} /> Novo Gráfico
          </button>
        </div>
      </div>

      {/* Resumo das fontes de dados */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {DATA_SOURCES.map(src => (
          <div key={src.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ color: 'var(--accent)', background: 'rgba(22,163,74,0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>{src.icon}</div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.875rem', color: 'var(--text-heading)' }}>{src.label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rawData[src.id].length} {rawData[src.id].length === 1 ? 'registro' : 'registros'}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Grid de gráficos */}
      {charts.length === 0 && !showBuilder ? (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'var(--bg-card)', borderRadius: '1.5rem', border: '2px dashed var(--border-color)' }}>
          <BarChart2 size={64} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-heading)', marginBottom: '0.5rem' }}>Nenhum gráfico criado ainda</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Clique em "Novo Gráfico" para criar sua primeira visualização.</p>
          <button onClick={() => setShowBuilder(true)} style={{ padding: '0.75rem 2rem', background: 'var(--accent)', border: 'none', borderRadius: '0.875rem', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '1rem' }}>
            <Plus size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Criar Primeiro Gráfico
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(520px, 1fr))', gap: '1.5rem' }}>
          {charts.map(cfg => (
            <div key={cfg.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '1.25rem', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              {/* Chart header */}
              <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-heading)' }}>{cfg.title}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {DATA_SOURCES.find(d => d.id === cfg.source)?.label} · {CHART_TYPES.find(t => t.id === cfg.type)?.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: cfg.color }} />
                  <button onClick={() => removeChart(cfg.id)} title="Remover gráfico" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem', borderRadius: '0.375rem', display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {/* Chart body */}
              <div style={{ padding: '1rem' }}>
                {loading ? (
                  <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Carregando dados...</div>
                ) : renderChart(cfg)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Builder */}
      {showBuilder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '1.5rem', padding: '2rem', width: '100%', maxWidth: '560px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Criar Novo Gráfico</h2>
              <button onClick={() => setShowBuilder(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
            </div>

            {/* Título */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Título do Gráfico</label>
              <input
                value={newChart.title}
                onChange={e => setNewChart(p => ({ ...p, title: e.target.value }))}
                placeholder="Ex: Pontuação da Equipe"
                style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', color: 'var(--text-main)', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Fonte de dados */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Fonte de Dados</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {DATA_SOURCES.map(src => (
                  <div
                    key={src.id}
                    onClick={() => setNewChart(p => ({ ...p, source: src.id }))}
                    style={{
                      padding: '0.875rem 1rem', borderRadius: '0.875rem', cursor: 'pointer', transition: 'all 0.2s',
                      border: `2px solid ${newChart.source === src.id ? 'var(--accent)' : 'var(--border-color)'}`,
                      background: newChart.source === src.id ? 'rgba(22,163,74,0.08)' : 'var(--bg-card)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', color: newChart.source === src.id ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {src.icon}
                      <span style={{ fontWeight: '700', fontSize: '0.875rem', color: newChart.source === src.id ? 'var(--text-heading)' : 'var(--text-main)' }}>{src.label}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{src.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tipo de gráfico */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Tipo de Gráfico</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {CHART_TYPES.map(ct => (
                  <button
                    key={ct.id}
                    onClick={() => setNewChart(p => ({ ...p, type: ct.id }))}
                    style={{
                      flex: 1, padding: '0.625rem 0.5rem', borderRadius: '0.75rem', cursor: 'pointer', transition: 'all 0.2s',
                      border: `2px solid ${newChart.type === ct.id ? 'var(--accent)' : 'var(--border-color)'}`,
                      background: newChart.type === ct.id ? 'rgba(22,163,74,0.1)' : 'var(--bg-card)',
                      color: newChart.type === ct.id ? 'var(--accent)' : 'var(--text-muted)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', fontWeight: '600', fontSize: '0.8rem'
                    }}
                  >
                    {ct.icon}
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cor */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Cor do Gráfico</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {PALETTE.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewChart(p => ({ ...p, color: c }))}
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                      boxShadow: newChart.color === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : 'none',
                      transform: newChart.color === c ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all 0.15s'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Pré-visualização */}
            {newChart.title && (
              <div style={{ marginBottom: '1.5rem', background: 'var(--bg-hover)', borderRadius: '1rem', padding: '1rem', border: '1px dashed var(--border-color)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: '600' }}>PRÉVIA</p>
                {renderChart({ ...newChart, id: 'preview' })}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowBuilder(false)}
                style={{ flex: 1, padding: '0.75rem', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '0.875rem', color: 'var(--text-muted)', fontWeight: '600', cursor: 'pointer', fontSize: '0.95rem' }}
              >
                Cancelar
              </button>
              <button
                onClick={addChart}
                disabled={!newChart.title.trim()}
                style={{ flex: 2, padding: '0.75rem', background: newChart.title.trim() ? 'var(--accent)' : 'var(--bg-hover)', border: 'none', borderRadius: '0.875rem', color: newChart.title.trim() ? 'white' : 'var(--text-muted)', fontWeight: '700', cursor: newChart.title.trim() ? 'pointer' : 'default', fontSize: '0.95rem' }}
              >
                Adicionar Gráfico
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BIPanel;
