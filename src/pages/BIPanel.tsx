import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import {
  BarChart2, PieChart as PieIcon, TrendingUp, Activity,
  Plus, Trash2, RefreshCw, Trophy, Target, ShoppingBag, Briefcase, FolderOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BASE_API_URL from '../api/config';

const API_URL = `${BASE_API_URL}/api`;

const PALETTE = ['#16a34a','#22c55e','#4ade80','#f59e0b','#3b82f6','#8b5cf6','#ec4899','#ef4444','#06b6d4','#84cc16'];

type ChartType = 'bar' | 'line' | 'area' | 'pie';
type DataSource = 'ranking' | 'goals' | 'redemptions' | 'checklist' | 'projects_status' | 'projects_progress' | 'projects_analyst' | 'portfolios_owner';

interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  source: DataSource;
  color: string;
}

const DATA_SOURCES: { id: DataSource; label: string; icon: React.ReactNode; desc: string; category: string }[] = [
  // Gamificação
  { id: 'ranking',           label: 'Pontuação Geral',           icon: <Trophy size={16} />,    desc: 'Total de pontos por membro',               category: 'Gamificação' },
  { id: 'goals',             label: 'Pontos por Meta',           icon: <Target size={16} />,    desc: 'Valor em pontos por tipo de meta',          category: 'Gamificação' },
  { id: 'redemptions',       label: 'Resgates da Loja',          icon: <ShoppingBag size={16}/>,desc: 'Pontos gastos por item resgatado',          category: 'Gamificação' },
  { id: 'checklist',         label: 'Checklist da Equipe',       icon: <Activity size={16} />,  desc: 'Tarefas concluídas vs pendentes',           category: 'Gamificação' },
  // Projetos
  { id: 'projects_status',   label: 'Projetos por Status',       icon: <Briefcase size={16} />, desc: 'Quantidade de projetos em cada status',     category: 'Projetos' },
  { id: 'projects_progress', label: 'Progresso dos Projetos',    icon: <Briefcase size={16} />, desc: 'Progresso (%) de cada projeto',             category: 'Projetos' },
  { id: 'projects_analyst',  label: 'Projetos por Analista',     icon: <Briefcase size={16} />, desc: 'Quantidade de projetos por analista',       category: 'Projetos' },
  // Portfólios
  { id: 'portfolios_owner',  label: 'Portfólios por Responsável',icon: <FolderOpen size={16} />,desc: 'Quantidade de portfólios por responsável',  category: 'Portfólios' },
];

const CHART_TYPES: { id: ChartType; label: string; icon: React.ReactNode }[] = [
  { id: 'bar',  label: 'Barras', icon: <BarChart2 size={16} /> },
  { id: 'line', label: 'Linha',  icon: <TrendingUp size={16} /> },
  { id: 'area', label: 'Área',   icon: <Activity size={16} /> },
  { id: 'pie',  label: 'Pizza',  icon: <PieIcon size={16} /> },
];

const CATEGORIES = ['Gamificação', 'Projetos', 'Portfólios'];

const BIPanel: React.FC = () => {
  const { token } = useAuth();
  const [charts, setCharts] = useState<ChartConfig[]>(() => {
    const saved = localStorage.getItem('liga-bi-charts');
    return saved ? JSON.parse(saved) : [];
  });
  const [rawData, setRawData] = useState<Record<DataSource, any[]>>({
    ranking: [], goals: [], redemptions: [], checklist: [],
    projects_status: [], projects_progress: [], projects_analyst: [], portfolios_owner: []
  });
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [newChart, setNewChart] = useState<Omit<ChartConfig, 'id'>>({
    title: '', type: 'bar', source: 'ranking', color: PALETTE[0]
  });

  useEffect(() => { if (token) fetchAllData(); }, [token]);

  useEffect(() => {
    localStorage.setItem('liga-bi-charts', JSON.stringify(charts));
  }, [charts]);

  const fetchAllData = async () => {
    setLoading(true);
    const h = { Authorization: `Bearer ${token}` };
    try {
      const [resRanking, resGoals, resRedemptions, resChecklist, resProjects, resPortfolios] = await Promise.all([
        fetch(`${API_URL}/ranking`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/task-types`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/redemptions/all`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/checklists`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/projects`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/portfolios`, { headers: h }).catch(() => null),
      ]);

      const ranking: any[] = resRanking?.ok ? await resRanking.json() : [];
      const goals: any[] = resGoals?.ok ? await resGoals.json() : [];
      const redemptions: any[] = resRedemptions?.ok ? await resRedemptions.json() : [];
      const checklist: any[] = resChecklist?.ok ? await resChecklist.json() : [];
      const projects: any[] = resProjects?.ok ? await resProjects.json() : [];
      const portfolios: any[] = resPortfolios?.ok ? await resPortfolios.json() : [];

      setRawData({
        ranking:          ranking.slice(0, 10).map(r => ({ name: r.name?.split(' ')[0] || r.username, value: r.total_points })),
        goals:            goals.map(g => ({ name: g.name.length > 20 ? g.name.slice(0, 18) + '…' : g.name, value: g.points })),
        redemptions:      buildGrouped(redemptions, 'item_name', 'points_spent'),
        checklist:        [{ name: 'Concluídas', value: checklist.filter(c => c.completed).length }, { name: 'Pendentes', value: checklist.filter(c => !c.completed).length }],
        projects_status:  buildGroupedCount(projects, 'status'),
        projects_progress:projects.slice(0, 12).map(p => ({ name: p.name?.length > 18 ? p.name.slice(0, 16) + '…' : p.name, value: Number(p.progress) || 0 })),
        projects_analyst: buildGroupedCount(projects, 'analyst'),
        portfolios_owner: buildGroupedCount(portfolios, 'owner'),
      });
    } catch (err) {
      console.error('BIPanel fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const buildGrouped = (data: any[], keyField: string, valueField: string) => {
    const grouped: Record<string, number> = {};
    data.forEach(r => {
      const k = r[keyField] || 'Outros';
      grouped[k] = (grouped[k] || 0) + (Number(r[valueField]) || 0);
    });
    return Object.entries(grouped).map(([name, value]) => ({ name: name.length > 18 ? name.slice(0, 16) + '…' : name, value }));
  };

  const buildGroupedCount = (data: any[], keyField: string) => {
    const grouped: Record<string, number> = {};
    data.forEach(r => {
      const k = r[keyField] || 'Não definido';
      grouped[k] = (grouped[k] || 0) + 1;
    });
    return Object.entries(grouped).map(([name, value]) => ({ name: name.length > 18 ? name.slice(0, 16) + '…' : name, value }));
  };

  const addChart = () => {
    if (!newChart.title.trim()) return;
    setCharts(prev => [...prev, { ...newChart, id: Math.random().toString(36).slice(2) }]);
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '220px', color: 'var(--text-muted)', fontSize: '0.875rem', flexDirection: 'column', gap: '0.5rem' }}>
          <Activity size={32} style={{ opacity: 0.3 }} />
          Sem dados disponíveis
        </div>
      );
    }

    const commonProps = { data, margin: { top: 10, right: 10, left: 0, bottom: 50 } };
    const xAxisProps = { dataKey: 'name', tick: { fontSize: 11, fill: 'var(--text-muted)' } as any, angle: -35, textAnchor: 'end' as const, interval: 0 };
    const yAxisProps = { tick: { fontSize: 11, fill: 'var(--text-muted)' } as any };
    const gridProps = { strokeDasharray: '3 3', stroke: 'var(--border-color)' };
    const tooltipStyle = { contentStyle: { background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '13px' } };

    if (cfg.type === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={95}
              label={(props) => `${props.name ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip {...tooltipStyle} formatter={(v: any) => [v, 'Total']} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (cfg.type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart {...commonProps}>
            <CartesianGrid {...gridProps} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipStyle} />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={{ fill: color, r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (cfg.type === 'area') {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id={`grad-${cfg.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipStyle} />
            <Area type="monotone" dataKey="value" stroke={color} fill={`url(#grad-${cfg.id})`} strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart {...commonProps}>
          <CartesianGrid {...gridProps} />
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip {...tooltipStyle} />
          <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // Fonte selecionada no builder
  const selectedSource = DATA_SOURCES.find(d => d.id === newChart.source);

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <BarChart2 size={32} color="var(--accent)" /> Painel BI
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Crie gráficos personalizados com os dados da equipe, projetos e portfólios.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchAllData} style={{ padding: '0.625rem 1rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
            <RefreshCw size={16} /> Atualizar
          </button>
          <button onClick={() => setShowBuilder(true)} style={{ padding: '0.625rem 1.25rem', background: 'var(--accent)', border: 'none', borderRadius: '0.75rem', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', fontSize: '0.875rem', boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}>
            <Plus size={18} /> Novo Gráfico
          </button>
        </div>
      </div>

      {/* Resumo das fontes agrupadas por categoria */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
        {CATEGORIES.map(cat => {
          const sources = DATA_SOURCES.filter(s => s.category === cat);
          return (
            <div key={cat}>
              <p style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{cat}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '0.75rem' }}>
                {sources.map(src => (
                  <div key={src.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.875rem', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ color: 'var(--accent)', background: 'rgba(22,163,74,0.1)', padding: '0.4rem', borderRadius: '0.5rem', flexShrink: 0 }}>{src.icon}</div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.8rem', color: 'var(--text-heading)', marginBottom: '0.1rem' }}>{src.label}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{rawData[src.id].length} {rawData[src.id].length === 1 ? 'registro' : 'registros'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))', gap: '1.5rem' }}>
          {charts.map(cfg => (
            <div key={cfg.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '1.25rem', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-heading)' }}>{cfg.title}</h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {DATA_SOURCES.find(d => d.id === cfg.source)?.label} · {CHART_TYPES.find(t => t.id === cfg.type)?.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: cfg.color }} />
                  <button onClick={() => removeChart(cfg.id)} title="Remover" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center', borderRadius: '0.375rem' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div style={{ padding: '1rem' }}>
                {loading ? (
                  <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Carregando dados...</div>
                ) : renderChart(cfg)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Builder */}
      {showBuilder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '1.5rem', padding: '2rem', width: '100%', maxWidth: '620px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Criar Novo Gráfico</h2>
              <button onClick={() => setShowBuilder(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
            </div>

            {/* Título */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Título do Gráfico</label>
              <input
                value={newChart.title}
                onChange={e => setNewChart(p => ({ ...p, title: e.target.value }))}
                placeholder="Ex: Status dos Projetos"
                style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', color: 'var(--text-main)', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Fonte de dados agrupada por categoria */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Fonte de Dados</label>
              {CATEGORIES.map(cat => {
                const sources = DATA_SOURCES.filter(s => s.category === cat);
                return (
                  <div key={cat} style={{ marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: '0.5rem' }}>{cat}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                      {sources.map(src => (
                        <div key={src.id} onClick={() => setNewChart(p => ({ ...p, source: src.id }))}
                          style={{ padding: '0.75rem', borderRadius: '0.75rem', cursor: 'pointer', transition: 'all 0.15s',
                            border: `2px solid ${newChart.source === src.id ? 'var(--accent)' : 'var(--border-color)'}`,
                            background: newChart.source === src.id ? 'rgba(22,163,74,0.08)' : 'var(--bg-card)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem', color: newChart.source === src.id ? 'var(--accent)' : 'var(--text-muted)' }}>
                            {src.icon}
                            <span style={{ fontWeight: '700', fontSize: '0.8rem', color: 'var(--text-heading)' }}>{src.label}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>{src.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tipo de gráfico */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Tipo de Gráfico</label>
              <div style={{ display: 'flex', gap: '0.625rem' }}>
                {CHART_TYPES.map(ct => (
                  <button key={ct.id} onClick={() => setNewChart(p => ({ ...p, type: ct.id }))}
                    style={{ flex: 1, padding: '0.625rem 0.5rem', borderRadius: '0.75rem', cursor: 'pointer', transition: 'all 0.15s',
                      border: `2px solid ${newChart.type === ct.id ? 'var(--accent)' : 'var(--border-color)'}`,
                      background: newChart.type === ct.id ? 'rgba(22,163,74,0.1)' : 'var(--bg-card)',
                      color: newChart.type === ct.id ? 'var(--accent)' : 'var(--text-muted)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', fontWeight: '600', fontSize: '0.8rem' }}>
                    {ct.icon}{ct.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cor */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Cor do Gráfico</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {PALETTE.map(c => (
                  <button key={c} onClick={() => setNewChart(p => ({ ...p, color: c }))}
                    style={{ width: '30px', height: '30px', borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                      boxShadow: newChart.color === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : 'none',
                      transform: newChart.color === c ? 'scale(1.2)' : 'scale(1)', transition: 'all 0.15s' }} />
                ))}
              </div>
            </div>

            {/* Prévia */}
            {newChart.title && (
              <div style={{ marginBottom: '1.5rem', background: 'var(--bg-hover)', borderRadius: '1rem', padding: '1rem', border: '1px dashed var(--border-color)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: '700' }}>PRÉVIA — {selectedSource?.label}</p>
                {renderChart({ ...newChart, id: 'preview' })}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setShowBuilder(false)}
                style={{ flex: 1, padding: '0.75rem', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '0.875rem', color: 'var(--text-muted)', fontWeight: '600', cursor: 'pointer', fontSize: '0.95rem' }}>
                Cancelar
              </button>
              <button onClick={addChart} disabled={!newChart.title.trim()}
                style={{ flex: 2, padding: '0.75rem', background: newChart.title.trim() ? 'var(--accent)' : 'var(--bg-hover)', border: 'none', borderRadius: '0.875rem',
                  color: newChart.title.trim() ? 'white' : 'var(--text-muted)', fontWeight: '700', cursor: newChart.title.trim() ? 'pointer' : 'default', fontSize: '0.95rem' }}>
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
