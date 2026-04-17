import React, { useState, useEffect } from 'react';
import '../styles/form.css';
import { FormData, CronogramaFase } from '../types';
import { Plus, Trash2, Calendar, FileText, CheckCircle, Clock, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BASE_API_URL from '../api/config';

interface CronogramaFormProps {
  initialData?: FormData;
  onSave: (doc: FormData) => void;
  onCancel: () => void;
}

const API_URL = `${BASE_API_URL}/api`;

const defaultFase = (): CronogramaFase => ({
  id: Math.random().toString(36).substr(2, 9),
  nome: '',
  descricao: '',
  data_inicio: '',
  data_fim: '',
  itens_impl: [''],
  itens_cliente: ['']
});

const defaultData: FormData = {
  nome: '',
  responsavel: '',
  cargo: '',
  email: '',
  tel: '',
  data: new Date().toISOString().split('T')[0],
  implantador: '',
  tipo_op: [],
  unidades: '',
  volume: '',
  areas: [],
  area_responsibles: [],
  obs_contexto: '',
  processo_atual: '',
  gargalos: '',
  etapas_manuais: '',
  modulos: [],
  fase2: '',
  custom: '',
  equipamentos: '',
  analyzers: [],
  integracoes: [],
  integracoes_detalhes: [],
  resp_ti: '',
  infra_servidor: 'Não',
  infra_acesso: '',
  infra_specs: '',
  infra_leitor: 'Não',
  printers: [],
  cron_config_days: [],
  cron_config_resp: '',
  cron_test_interf_days: [],
  cron_test_interf_resp: '',
  cron_treino_days: [],
  cron_treino_resp: '',
  cron_test_integ_days: [],
  cron_test_integ_resp: '',
  disponibilidade_tipo: 'Diária',
  disponibilidade_config_dias: [],
  disponibilidade_semanal_dias: [],
  disponibilidade_semanal_horas_dia: '',
  disponibilidade_semanal_horas_total: '',
  migracao: [],
  migracao_convenios_qtd: '',
  qualidade_base: '',
  prazo_base: '',
  resp_dados: '',
  sponsor: '',
  aprovador: '',
  resp_teste: '',
  resp_treinamento: '',
  golive: '',
  disponibilidade: '',
  reunioes_config: [],
  periodos_criticos: '',
  prazo_contrato: '',
  riscos: [],
  sucesso: '',
  fora_padrao: '',
  pendencias: '',
  kickoff_date: '',
  kickoff_time: '',
  kickoff_format: '',
  dinamica_implantacao: '',
  comunicacao_oficial: '',
  agendamentos_reunioes: '',
  validacoes_andamento: '',
  validacoes_pos_fluxo: '',
  rotina_semanal: '',
  rotina_envio_modo: '',
  rotina_envio_emails: '',
  rotina_envio_whatsapps: '',
  rotina_envio_outro: '',
  horario_setor: '',
  base_padrao: '',
  documentos_adicionais: [],
  cron_inicio_projeto: '',
  cron_virada_prevista: '',
  cron_duracao_total: '',
  cron_fases: [defaultFase()]
};

const CronogramaForm: React.FC<CronogramaFormProps> = ({ initialData, onSave, onCancel }) => {
  const { token } = useAuth();
  const [data, setData] = useState<FormData>({ ...defaultData, ...initialData });
  const [mode, setMode] = useState<'form' | 'preview'>('form');
  const [implantadores, setImplantadores] = useState<{ id: string, name: string }[]>([]);
  const [showAddImp, setShowAddImp] = useState(false);
  const [newImpName, setNewImpName] = useState('');

  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/implantadores`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(setImplantadores)
        .catch(err => console.error('Erro ao buscar implantadores:', err));
    }
  }, [token]);

  useEffect(() => {
    if (data.cron_inicio_projeto && data.cron_virada_prevista) {
      const start = new Date(data.cron_inicio_projeto);
      const end = new Date(data.cron_virada_prevista);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (!isNaN(diffDays)) {
        setData(prev => ({ ...prev, cron_duracao_total: `${diffDays} dias` }));
      }
    }
  }, [data.cron_inicio_projeto, data.cron_virada_prevista]);

  const handleAddImplantador = async () => {
    if (!newImpName.trim() || !token) return;
    try {
      const res = await fetch(`${API_URL}/implantadores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newImpName })
      });
      if (res.ok) {
        const newItem = await res.json();
        setImplantadores(prev => [...prev, newItem].sort((a, b) => a.name.localeCompare(b.name)));
        setData({ ...data, implantador: newItem.name });
        setNewImpName('');
        setShowAddImp(false);
      } else {
        const err = await res.json();
        alert('Erro ao cadastrar: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (err) {
      alert('Erro ao cadastrar implantador');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    const key = id.startsWith('f_') ? id.substring(2) : id;
    setData({ ...data, [key]: value });
  };

  const handleFaseChange = (index: number, field: keyof CronogramaFase, value: any) => {
    const newFases = [...data.cron_fases];
    newFases[index] = { ...newFases[index], [field]: value };
    setData({ ...data, cron_fases: newFases });
  };

  const updateListField = (faseIndex: number, field: 'itens_impl' | 'itens_cliente', itemIndex: number, value: string) => {
    const newFases = [...data.cron_fases];
    const newList = [...newFases[faseIndex][field]];
    newList[itemIndex] = value;
    newFases[faseIndex][field] = newList;
    setData({ ...data, cron_fases: newFases });
  };

  const addListItem = (faseIndex: number, field: 'itens_impl' | 'itens_cliente') => {
    const newFases = [...data.cron_fases];
    newFases[faseIndex][field] = [...newFases[faseIndex][field], ''];
    setData({ ...data, cron_fases: newFases });
  };

  const removeListItem = (faseIndex: number, field: 'itens_impl' | 'itens_cliente', itemIndex: number) => {
    const newFases = [...data.cron_fases];
    if (newFases[faseIndex][field].length > 1) {
      newFases[faseIndex][field] = newFases[faseIndex][field].filter((_, i) => i !== itemIndex);
      setData({ ...data, cron_fases: newFases });
    }
  };

  const addFase = () => {
    setData({ ...data, cron_fases: [...data.cron_fases, defaultFase()] });
  };

  const removeFase = (index: number) => {
    if (data.cron_fases.length > 1) {
      setData({ ...data, cron_fases: data.cron_fases.filter((_, i) => i !== index) });
    }
  };

  const fmtDate = (s: string) => {
    if (!s) return '';
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  };

  if (mode === 'preview') {
    const hoje = new Date().toLocaleDateString('pt-BR');
    return (
      <div className="pdf-screen">
        <div className="pdf-toolbar">
          <button className="btn-back" onClick={() => setMode('form')}>← Voltar</button>
          <button className="btn-print" onClick={() => window.print()}>🖨️ Imprimir PDF</button>
        </div>
        <div className="doc">
          <div className="doc-header">
            <div className="doc-title">
              <h1>📅 Cronograma de Implantação</h1>
              <p>Planejamento Estratégico de Projeto</p>
            </div>
            <div className="doc-meta">
              <strong>{data.nome || '(cliente não informado)'}</strong><br />
              <span>Implantador: <strong>{data.implantador || 'Não informado'}</strong></span><br />
              Data do Documento: {hoje}
            </div>
          </div>

          <div className="doc-section">
            <h2>🏷️ 1. Premissas</h2>
            <div className="doc-grid">
              <div className="doc-cell"><label>Início do Projeto</label><span>{fmtDate(data.cron_inicio_projeto) || 'Não informado'}</span></div>
              <div className="doc-cell"><label>Data de Virada Prevista</label><span>{fmtDate(data.cron_virada_prevista) || 'Não informado'}</span></div>
              <div className="doc-cell"><label>Duração Total</label><span>{data.cron_duracao_total || 'Não informado'}</span></div>
            </div>
          </div>

          {data.cron_fases.map((fase, idx) => (
            <div key={fase.id} className="doc-section doc-page-break" style={{ pageBreakInside: 'avoid' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ margin: 0 }}>📍 Fase {idx + 1}: {fase.nome || '(Sem nome)'}</h2>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
                  {fmtDate(fase.data_inicio)} até {fmtDate(fase.data_fim)}
                </span>
              </div>
              
              <div className="doc-grid full">
                <div className="doc-cell full">
                  <label>Descrição da Fase</label>
                  <span>{fase.descricao || 'Sem descrição'}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
                <div style={{ background: 'rgba(3, 105, 161, 0.04)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(3, 105, 161, 0.1)' }}>
                  <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#0369a1', marginBottom: '15px', marginTop: 0, fontWeight: 800, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} /> Implantação (LIGA)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {fase.itens_impl.map((item, i) => item && (
                      <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#0c4a6e', lineHeight: '1.4' }}>
                        <div style={{ color: '#0369a1', marginTop: '2px' }}><Plus size={12} /></div>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: 'rgba(157, 23, 77, 0.04)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(157, 23, 77, 0.1)' }}>
                  <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#9d174d', marginBottom: '15px', marginTop: 0, fontWeight: 800, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} /> Cliente (Laboratório)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {fase.itens_cliente.map((item, i) => item && (
                      <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#831843', lineHeight: '1.4' }}>
                        <div style={{ color: '#9d174d', marginTop: '2px' }}><Plus size={12} /></div>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="doc-section doc-page-break" style={{ border: 'none', marginTop: '40px', pageBreakBefore: 'always' }}>
            <div style={{ 
              padding: '25px', 
              background: '#f8fafc', 
              border: '1px solid #e2e8f0', 
              borderRadius: '12px',
              marginBottom: '40px'
            }}>
              <h2 style={{ color: '#1e293b', marginBottom: '15px' }}>🤝 Compromisso de Implantação</h2>
              <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.6', marginBottom: '10px' }}>
                Com a assinatura deste documento, as partes confirmam estar alinhadas com as datas, fases e responsabilidades 
                descritas neste cronograma. Nosso objetivo comum é garantir uma transição suave, autônoma e eficiente para 
                a utilização plena do software LIGA no laboratório dentro dos prazos pactuados.
              </p>
            </div>

            <div className="doc-footer" style={{ borderTop: 'none', marginTop: '0' }}>
              <div className="sig-row">
                <div className="sig-box">
                  <div className="sig-line"></div>
                  Laborat&oacute;rio / Respons&aacute;vel<br /><small>{data.responsavel || '___________________'}</small>
                </div>
                <div className="sig-box">
                  <div className="sig-line"></div>
                  Implantador Respons&aacute;vel<br /><small>{data.implantador || '___________________'}</small>
                </div>
                <div className="sig-box">
                  <div className="sig-line"></div>
                  Coordenador de Implanta&ccedil;&atilde;o<br /><small>Yuri Tavares Gon&ccedil;alves</small>
                </div>
              </div>
              <div className="doc-footer-note">
                Documento gerado em {hoje} &nbsp;|&nbsp; Uso interno &mdash; Implanta&ccedil;&atilde;o de Sistema Laboratorial
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="form-screen">
      <div className="page-header">
        <div className="logo-bar">🔬 Sistema de Implantação Laboratorial</div>
        <h1>Cronograma de Projeto</h1>
        <p>Desenhe as etapas e responsabilidades para cada fase da implantação.</p>
      </div>

      <div className="card">
        <div className="card-header"><span className="icon">🏷️</span><h2>1. Premissas</h2></div>
        <div className="card-body">
          <div className="form-row">
            <div className="field">
              <label>Nome do Laboratório <span className="req">*</span></label>
              <input id="f_nome" type="text" value={data.nome} onChange={handleChange} placeholder="Ex: Laboratório Central" />
            </div>
            <div className="field">
              <label>Implantador</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {!showAddImp ? (
                  <>
                    <select 
                      id="f_implantador" 
                      value={data.implantador} 
                      onChange={handleChange}
                      style={{ flex: 1 }}
                    >
                      <option value="">Selecione um implantador...</option>
                      {implantadores.map(imp => (
                        <option key={imp.id} value={imp.name}>{imp.name}</option>
                      ))}
                    </select>
                    <button 
                      type="button" 
                      onClick={() => setShowAddImp(true)} 
                      className="btn-add-lite" 
                      style={{ padding: '8px', background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}
                      title="Cadastrar novo implantador"
                    >
                      <UserPlus size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <input 
                      type="text" 
                      value={newImpName} 
                      onChange={(e) => setNewImpName(e.target.value)}
                      placeholder="Nome do novo implantador"
                      style={{ flex: 1 }}
                      autoFocus
                    />
                    <button 
                      type="button" 
                      onClick={handleAddImplantador} 
                      className="btn-primary" 
                      style={{ padding: '8px 16px', background: '#166534', minHeight: 'auto' }}
                    >
                      Salvar
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setShowAddImp(false); setNewImpName(''); }} 
                      style={{ padding: '8px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Início do Projeto</label>
              <input id="f_cron_inicio_projeto" type="date" value={data.cron_inicio_projeto} onChange={handleChange} />
            </div>
            <div className="field">
              <label>Data de Virada Prevista</label>
              <input id="f_cron_virada_prevista" type="date" value={data.cron_virada_prevista} onChange={handleChange} />
            </div>
            <div className="field">
              <label>Duração Total</label>
              <input id="f_cron_duracao_total" type="text" value={data.cron_duracao_total} onChange={handleChange} placeholder="Ex: 3 meses / 90 dias" />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="icon">📍</span>
          <h2>Fases do Projeto</h2>
          <button className="btn-add-lite" onClick={addFase} style={{ marginLeft: 'auto' }}>+ Adicionar Fase</button>
        </div>
        <div className="card-body">
          {data.cron_fases.map((fase, idx) => (
            <div key={fase.id} className="fase-container" style={{ 
              background: 'rgba(59, 130, 246, 0.03)', 
              border: '1px solid rgba(59, 130, 246, 0.1)', 
              borderRadius: '12px', 
              padding: '20px', 
              marginBottom: '30px',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <span style={{ 
                  background: 'var(--accent)', 
                  color: 'white', 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700
                }}>{idx + 1}</span>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Configuração da Fase</h3>
                {data.cron_fases.length > 1 && (
                  <button onClick={() => removeFase(idx)} style={{ marginLeft: 'auto', background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                    <Trash2 size={16} /> Remover Fase
                  </button>
                )}
              </div>

              <div className="form-row full" style={{ marginBottom: '15px' }}>
                <div className="field">
                  <label>Nome da Fase</label>
                  <input 
                    type="text" 
                    value={fase.nome} 
                    onChange={(e) => handleFaseChange(idx, 'nome', e.target.value)} 
                    placeholder="Ex: Infraestrutura e Configurações Iniciais"
                  />
                </div>
              </div>

              <div className="form-row" style={{ display: 'flex', gap: '15px', maxWidth: '400px', marginBottom: '15px' }}>
                <div className="field" style={{ flex: 1 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> Início</label>
                  <input 
                    type="date" 
                    value={fase.data_inicio} 
                    onChange={(e) => handleFaseChange(idx, 'data_inicio', e.target.value)} 
                    style={{ fontSize: '13px', padding: '8px' }}
                  />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> Fim</label>
                  <input 
                    type="date" 
                    value={fase.data_fim} 
                    onChange={(e) => handleFaseChange(idx, 'data_fim', e.target.value)} 
                    style={{ fontSize: '13px', padding: '8px' }}
                  />
                </div>
              </div>

              <div className="form-row full">
                <div className="field">
                  <label>Descrição da Fase</label>
                  <textarea 
                    value={fase.descricao} 
                    onChange={(e) => handleFaseChange(idx, 'descricao', e.target.value)} 
                    placeholder="O que será entregue nesta etapa..."
                    rows={2}
                  />
                </div>
              </div>

              <div className="dynamic-lists-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '10px' }}>
                {/* LISTA IMPLANTAÇÃO */}
                <div className="list-field">
                  <label style={{ color: '#0369a1', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <div style={{ background: '#e0f2fe', padding: '6px', borderRadius: '6px' }}><CheckCircle size={16} /></div> 
                    O que a LIGA fará?
                  </label>
                  <div className="items-column">
                    {fase.itens_impl.map((item, iIndex) => (
                      <div key={iIndex} className="topic-input-row" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        marginBottom: '10px',
                        background: 'white',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        transition: 'all 0.2s'
                      }}>
                        <div style={{ color: '#0369a1', opacity: 0.5 }}><Plus size={14} /></div>
                        <input 
                          type="text" 
                          value={item} 
                          onChange={(e) => updateListField(idx, 'itens_impl', iIndex, e.target.value)}
                          placeholder="Digite uma ação da LIGA..."
                          style={{ border: 'none', padding: '8px 0', fontSize: '13px', background: 'transparent', outline: 'none', width: '100%' }}
                        />
                        {fase.itens_impl.length > 1 && (
                          <button 
                            onClick={() => removeListItem(idx, 'itens_impl', iIndex)} 
                            style={{ color: '#94a3b8', border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', padding: '4px' }}
                            title="Remover item"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <button className="btn-add-lite" onClick={() => addListItem(idx, 'itens_impl')} style={{ 
                      fontSize: '12px', 
                      padding: '8px 12px', 
                      width: '100%', 
                      justifyContent: 'center',
                      background: '#f8fafc',
                      border: '1px dashed #cbd5e1',
                      color: '#64748b'
                    }}>
                      + Adicionar Tópico de Ação
                    </button>
                  </div>
                </div>

                {/* LISTA CLIENTE */}
                <div className="list-field">
                  <label style={{ color: '#9d174d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <div style={{ background: '#fce7f3', padding: '6px', borderRadius: '6px' }}><Clock size={16} /></div> 
                    O que o Laboratório fará?
                  </label>
                  <div className="items-column">
                    {fase.itens_cliente.map((item, iIndex) => (
                      <div key={iIndex} className="topic-input-row" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        marginBottom: '10px',
                        background: 'white',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        transition: 'all 0.2s'
                      }}>
                        <div style={{ color: '#9d174d', opacity: 0.5 }}><Plus size={14} /></div>
                        <input 
                          type="text" 
                          value={item} 
                          onChange={(e) => updateListField(idx, 'itens_cliente', iIndex, e.target.value)}
                          placeholder="Digite uma obrigação do cliente..."
                          style={{ border: 'none', padding: '8px 0', fontSize: '13px', background: 'transparent', outline: 'none', width: '100%' }}
                        />
                        {fase.itens_cliente.length > 1 && (
                          <button 
                            onClick={() => removeListItem(idx, 'itens_cliente', iIndex)} 
                            style={{ color: '#94a3b8', border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', padding: '4px' }}
                            title="Remover item"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <button className="btn-add-lite" onClick={() => addListItem(idx, 'itens_cliente')} style={{ 
                      fontSize: '12px', 
                      padding: '8px 12px', 
                      width: '100%', 
                      justifyContent: 'center',
                      background: '#f8fafc',
                      border: '1px dashed #cbd5e1',
                      color: '#64748b'
                    }}>
                      + Adicionar Tópico de Ação
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="actions">
        <button className="btn-back" style={{ padding: '12px 24px', marginRight: 'auto' }} onClick={onCancel}>Cancelar</button>
        <button className="btn-preview" onClick={() => setMode('preview')}>👁️ Prévia</button>
        <button className="btn-pdf" onClick={() => { setMode('preview'); setTimeout(() => window.print(), 300); }}>📄 Imprimir</button>
        <button className="btn-primary" style={{ background: '#14532d', color: 'white' }} onClick={() => onSave(data)}>💾 Salvar Cronograma</button>
      </div>
    </div>
  );
};

export default CronogramaForm;
