import React, { useState, useEffect } from 'react';
import '../styles/form.css';

import { FormData, SavedDoc, Risk, DaySchedule, IntegrationDetailEntry } from '../types';

interface PreKickoffFormProps {
  initialData?: FormData;
  onSave: (doc: FormData) => void;
  onCancel: () => void;
}

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
  cron_test_interf_days: [],
  cron_treino_days: [],
  cron_test_integ_days: [],
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
  riscos: [{ desc: '', nivel: 'Média' }],
  sucesso: '',
  fora_padrao: '',
  pendencias: '',
  kickoff_date: '',
  kickoff_format: '',
};

const DAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const ScheduleSelector: React.FC<{ 
  days: DaySchedule[], 
  onChange: (days: DaySchedule[]) => void,
  label: string 
}> = ({ days, onChange, label }) => {
  const [globalStart, setGlobalStart] = useState('08:00');
  const [globalEnd, setGlobalEnd] = useState('18:00');

  const addDay = (dayName: string) => {
    if (days.find(d => d.day === dayName)) return;
    onChange([...days, { day: dayName, start: globalStart, end: globalEnd }]);
  };

  const removeDay = (dayName: string) => {
    onChange(days.filter(d => d.day !== dayName));
  };

  const updateGlobalTime = (field: 'start' | 'end', val: string) => {
    if (field === 'start') setGlobalStart(val);
    if (field === 'end') setGlobalEnd(val);
    
    onChange(days.map(d => ({ ...d, [field]: val })));
  };

  const updateTime = (dayName: string, field: 'start' | 'end', val: string) => {
    onChange(days.map(d => d.day === dayName ? { ...d, [field]: val } : d));
  };

  return (
    <div className="schedule-selector">
      {label && <label className="sub-label">{label}</label>}
      
      <div className="form-row" style={{ marginBottom: '15px' }}>
        <div className="field">
          <label>Horário Padrão (Início)</label>
          <input type="time" value={globalStart} onChange={e => updateGlobalTime('start', e.target.value)} />
        </div>
        <div className="field">
          <label>Horário Padrão (Fim)</label>
          <input type="time" value={globalEnd} onChange={e => updateGlobalTime('end', e.target.value)} />
        </div>
      </div>

      <label className="sub-label">Dias da Semana</label>
      <div className="tag-group" style={{ marginBottom: '15px' }}>
        {DAYS.map(d => (
          <label key={d} className={days.find(x => x.day === d) ? 'checked' : ''}>
            <input 
              type="checkbox" 
              checked={!!days.find(x => x.day === d)} 
              onChange={() => days.find(x => x.day === d) ? removeDay(d) : addDay(d)} 
            /> {d}
          </label>
        ))}
      </div>

      {days.length > 0 && (
        <div className="day-grid" style={{ background: 'var(--bg-page)', borderRadius: '10px', padding: '12px', marginTop: '6px', border: '1px dashed var(--border-color)' }}>
          <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 10px 0', fontStyle: 'italic' }}>✏️ Ajuste de horário específico por dia (opcional). Os campos já estão preenchidos com o horário padrão definido acima.</p>
          {days.map(d => (
            <div key={d.day} className="day-row" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <span className="day-name" style={{ minWidth: '110px', fontWeight: 700, color: 'var(--accent)', fontSize: '13px' }}>{d.day}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>De</span>
                <input type="time" value={d.start} onChange={e => updateTime(d.day, 'start', e.target.value)} style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px' }} />
                <span style={{ fontSize: '11px', color: '#64748b' }}>até</span>
                <input type="time" value={d.end} onChange={e => updateTime(d.day, 'end', e.target.value)} style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const PreKickoffForm: React.FC<PreKickoffFormProps> = ({ initialData, onSave, onCancel }) => {
  const [data, setData] = useState<FormData>(initialData || defaultData);
  const [mode, setMode] = useState<'form' | 'preview'>('form');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    // Map HTML IDs to state keys (remove f_ prefix if used in original HTML)
    const key = id.startsWith('f_') ? id.substring(2) : id;
    setData({ ...data, [key]: value });
  };

  const handleCheckbox = (name: keyof FormData, value: string) => {
    const current = data[name] as string[];
    const isAdding = !current.includes(value);
    const updated = isAdding
      ? [...current, value]
      : current.filter((v) => v !== value);
    
    // Auto-manage area_responsibles
    let newResponsibles = [...data.area_responsibles];
    if (name === 'areas') {
      if (isAdding) {
        newResponsibles.push({ area: value, manager: '', contact: '' });
      } else {
        newResponsibles = newResponsibles.filter(r => r.area !== value);
      }
    }

    // Auto-manage integration details
    let newIntegDetails = [...data.integracoes_detalhes];
    if (name === 'integracoes') {
      if (isAdding) {
        newIntegDetails.push({ key: value, tech: '', contact: '' });
      } else {
        newIntegDetails = newIntegDetails.filter(d => d.key !== value);
      }
    }

    setData({ ...data, [name]: updated, area_responsibles: newResponsibles, integracoes_detalhes: newIntegDetails });
  };

  const handleAreaRespChange = (index: number, field: 'manager' | 'contact', value: string) => {
    const resps = [...data.area_responsibles];
    resps[index] = { ...resps[index], [field]: value };
    setData({ ...data, area_responsibles: resps });
  };

  const addAnalyzer = () => {
    setData({ ...data, analyzers: [...data.analyzers, { name: '', unit: '' }] });
  };

  const removeAnalyzer = (index: number) => {
    setData({ ...data, analyzers: data.analyzers.filter((_, i) => i !== index) });
  };

  const addPrinter = () => {
    setData({ ...data, printers: [...data.printers, { count: 1, brand: '', model: '' }] });
  };

  const removePrinter = (index: number) => {
    setData({ ...data, printers: data.printers.filter((_, i) => i !== index) });
  };

  const addRisco = () => {
    setData({ ...data, riscos: [...data.riscos, { desc: '', nivel: 'Média' }] });
  };

  const handleRiscoChange = (index: number, field: keyof Risk, value: string) => {
    const newRiscos = [...data.riscos];
    newRiscos[index] = { ...newRiscos[index], [field]: value };
    setData({ ...data, riscos: newRiscos });
  };

  const fmtDate = (s: string) => {
    if (!s) return '';
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  };

  const renderScheduleTable = (schedules: DaySchedule[]) => {
    if (!schedules || schedules.length === 0) return <span>Não definido</span>;
    return (
      <table className="mini-table">
        <tbody>
          {schedules.map((s, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 600, width: '130px' }}>{s.day}</td>
              <td>{s.start} às {s.end}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderCell = (label: string, value: string | string[], full = false) => {
    const displayValue = Array.isArray(value) ? value.join(', ') : value;
    return (
      <div className={`doc-cell${full ? ' full' : ''}`}>
        <label>{label}</label>
        {displayValue ? <span>{displayValue}</span> : <span className="empty">Não informado</span>}
      </div>
    );
  };

  if (mode === 'preview') {
    const hoje = new Date().toLocaleDateString('pt-BR');
    return (
      <div className="pdf-screen">
        <div className="pdf-toolbar">
          <button className="btn-back" onClick={() => setMode('form')}>← Voltar</button>
          <button className="btn-print" onClick={() => window.print()}>🖨️ Imprimir / Salvar PDF</button>
        </div>
        <div className="doc">
          <div className="doc-header">
            <div className="doc-title">
              <h1>📋 Documento de Pré Kick-Off</h1>
              <p>Implantação de Sistema Laboratorial</p>
            </div>
            <div className="doc-meta">
              <strong>{data.nome || '(cliente não informado)'}</strong><br />
              <span>Implantador: <strong>{data.implantador || 'Não informado'}</strong></span><br />
              Data do Pré Kick-Off: {fmtDate(data.data) || hoje}<br />
              Gerado em: {hoje}
            </div>
          </div>

          <div className="doc-section">
            <h2>🏷️ Identificação</h2>
            <div className="doc-grid">
              {renderCell('Laboratório', data.nome)}
              {renderCell('Responsável', data.responsavel)}
              {renderCell('Cargo', data.cargo)}
              {renderCell('E-mail', data.email)}
              {renderCell('Telefone', data.tel)}
              {renderCell('Data do Pré Kick-Off', fmtDate(data.data))}
            </div>
          </div>

          <div className="doc-section">
            <h2>🔬 Contexto do Laboratório</h2>
            <div className="doc-grid">
              {renderCell('Tipo de Operação', data.tipo_op)}
              {renderCell('Nº de Unidades', data.unidades)}
              {renderCell('Volume Médio/Dia', data.volume)}
              {renderCell('Áreas Envolvidas', data.areas)}
              {data.area_responsibles.length > 0 && (
                <div className="doc-grid full no-border">
                  <table className="mini-table">
                    <thead>
                      <tr><th>Área</th><th>Responsável</th><th>Contato</th></tr>
                    </thead>
                    <tbody>
                      {data.area_responsibles.map((r, i) => (
                        <tr key={i}><td>{r.area}</td><td>{r.manager}</td><td>{r.contact}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {renderCell('Observações', data.obs_contexto, true)}
            </div>
          </div>

          <div className="doc-section">
            <h2>⚙️ Processo Atual</h2>
            <div className="doc-grid full">
              {renderCell('Fluxo Atual', data.processo_atual, true)}
              {renderCell('Gargalos / Dores', data.gargalos, true)}
              {renderCell('Etapas Manuais a Sistematizar', data.etapas_manuais, true)}
            </div>
          </div>

          <div className="doc-section">
            <h2>📦 Escopo da Implantação</h2>
            <div className="doc-grid full">
              {renderCell('Módulos no Go-Live', data.modulos, true)}
              {renderCell('Fase 2 (Pós Go-Live)', data.fase2, true)}
              {renderCell('Customizações Previstas', data.custom, true)}
            </div>
          </div>

          <div className="doc-section">
            <h2>🔌 Integrações e Equipamentos</h2>
            <div className="doc-grid full no-border">
              {data.analyzers.length > 0 ? (
                <table className="mini-table">
                  <thead>
                    <tr><th>Equipamento (Analisador)</th><th>Unidade / Local</th></tr>
                  </thead>
                  <tbody>
                    {data.analyzers.map((ana, i) => (
                      <tr key={i}><td>{ana.name}</td><td>{ana.unit}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="doc-cell full">
                  <label>Equipamentos para Interfaceamento</label>
                  <span>Nenhum equipamento registrado</span>
                </div>
              )}
            </div>
            
            {data.integracoes_detalhes.length > 0 && (
              <div className="doc-grid full no-border" style={{ marginTop: '10px' }}>
                <table className="mini-table">
                  <thead>
                    <tr><th>Integração</th><th>Responsável Técnico</th><th>Contato</th></tr>
                  </thead>
                  <tbody>
                    {data.integracoes_detalhes.map((det, i) => (
                      <tr key={i}><td>{det.key}</td><td>{det.tech}</td><td>{det.contact}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="doc-grid">
              {renderCell('Integrações com Sistemas Externos', data.integracoes)}
              {renderCell('Responsável Técnico (TI do Cliente)', data.resp_ti, true)}
            </div>
          </div>

          <div className="doc-section">
            <h2>🛡️ Infraestrutura</h2>
            <div className="doc-grid">
              {renderCell('Possui Servidor Local?', data.infra_servidor)}
              {data.infra_servidor === 'Sim' && renderCell('Dados de Acesso', data.infra_acesso)}
              {data.infra_servidor === 'Sim' && renderCell('Especificações', data.infra_specs, true)}
              {renderCell('Possui Leitor de Código de Barras?', data.infra_leitor, true)}
              
              {data.printers.length > 0 && (
                <div className="doc-grid full no-border">
                  <table className="mini-table">
                    <thead>
                      <tr><th>Qtd</th><th>Marca</th><th>Modelo</th></tr>
                    </thead>
                    <tbody>
                      {data.printers.map((ptr, i) => (
                        <tr key={i}><td>{ptr.count}</td><td>{ptr.brand}</td><td>{ptr.model}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="doc-section">
            <h2>🗓️ Cronograma e Disponibilidade</h2>
            <div className="doc-grid full no-border">
              <table className="mini-table schedule-preview">
                <thead>
                  <tr><th>Etapa</th><th>Dias e Horários Previstos</th></tr>
                </thead>
                <tbody>
                  <tr><td>Testes / Config. Sistema</td><td>{renderScheduleTable(data.cron_config_days)}</td></tr>
                  <tr><td>Testes / Interfaceamento</td><td>{renderScheduleTable(data.cron_test_interf_days)}</td></tr>
                  <tr><td>Treinamentos de Equipe</td><td>{renderScheduleTable(data.cron_treino_days)}</td></tr>
                  <tr><td>Testes de Integração</td><td>{renderScheduleTable(data.cron_test_integ_days)}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="doc-grid full">
              <div className="doc-cell full">
                <label>Disponibilidade do Cliente ({data.disponibilidade_tipo})</label>
                {data.disponibilidade_tipo === 'Diária' ? (
                  renderScheduleTable(data.disponibilidade_config_dias)
                ) : (
                  <div>
                    <strong>Dias:</strong> {data.disponibilidade_semanal_dias.join(', ')} <br/>
                    <strong>Carga Horária:</strong> {data.disponibilidade_semanal_horas_dia} por dia / {data.disponibilidade_semanal_horas_total} por semana
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="doc-section">
            <h2>🗄️ Dados e Migração</h2>
            <div className="doc-grid">
              {renderCell('Cadastros para Importar', data.migracao)}
              {renderCell('Qtd de Convênios', data.migracao_convenios_qtd)}
              {renderCell('Qualidade da Base', data.qualidade_base)}
              {renderCell('Prazo para Entrega das Bases', fmtDate(data.prazo_base))}
              {renderCell('Responsável pelos Dados', data.resp_dados)}
            </div>
          </div>

          <div className="doc-section">
            <h2>👥 Pessoas e Responsabilidades</h2>
            <div className="doc-grid">
              {renderCell('Sponsor', data.sponsor)}
              {renderCell('Aprovador Funcional', data.aprovador)}
              {renderCell('Responsável por Testes', data.resp_teste)}
              {renderCell('Responsável por Treinamento', data.resp_treinamento)}
            </div>
          </div>

          <div className="doc-section">
            <h2>📅 Prazos e Disponibilidade Geral</h2>
            <div className="doc-grid">
              {renderCell('Data Desejada Go-Live (VIRADA DO SISTEMA)', fmtDate(data.golive))}
              <div className="doc-cell full">
                <label>Disponibilidade de reuniões</label>
                {renderScheduleTable(data.reunioes_config)}
              </div>
              {renderCell('Períodos Críticos', data.periodos_criticos, true)}
              {renderCell('Impactos Contratuais', data.prazo_contrato, true)}
            </div>
          </div>

          <div className="doc-section">
            <h2>⚠️ Riscos e Pontos de Atenção</h2>
            {data.riscos.some(r => r.desc) ? (
              <table className="risk-table">
                <thead>
                  <tr><th>#</th><th>Risco / Ponto de Atenção</th><th>Prioridade</th></tr>
                </thead>
                <tbody>
                  {data.riscos.filter(r => r.desc).map((r, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{r.desc}</td>
                      <td>
                        <span className={`badge ${r.nivel === 'Alta' ? 'badge-alta' : r.nivel === 'Média' ? 'badge-media' : 'badge-baixa'}`}>
                          {r.nivel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="doc-grid full">{renderCell('Riscos Levantados', 'Nenhum risco registrado', true)}</div>
            )}
            <div className="doc-grid full" style={{ marginTop: '10px' }}>
              {renderCell('Critério de Sucesso (1º Mês)', data.sucesso, true)}
            </div>
          </div>

          <div className="doc-section">
            <h2>📝 Observações Finais e Próximos Passos</h2>
            <div className="doc-grid full">
              {renderCell('Processos Fora do Padrão', data.fora_padrao, true)}
              {renderCell('Pendências a Resolver', data.pendencias, true)}
              {renderCell('Data do Kick-Off Oficial', fmtDate(data.kickoff_date))}
              {renderCell('Formato do Kick-Off', data.kickoff_format)}
            </div>
          </div>

          <div className="doc-footer">
            <div className="sig-row">
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
    );
  }

  return (
    <div id="form-screen">
      <div className="page-header">
        <div className="logo-bar">🔬 Sistema de Implantação Laboratorial</div>
        <h1>Formulário de Pré Kick-Off</h1>
        <p>Preencha as informações do cliente antes da reunião de kick-off oficial.</p>
      </div>

      <div className="card">
        <div className="card-header"><span className="icon">🏷️</span><h2>1. Identificação do Cliente</h2></div>
        <div className="card-body">
          <div className="form-row">
            <div className="field"><label>Nome do Laboratório <span className="req">*</span></label>
              <input id="f_nome" type="text" value={data.nome} onChange={handleChange} placeholder="Ex: Laboratório Central Ltda." />
            </div>
            <div className="field"><label>Responsável pelo Projeto <span className="req">*</span></label>
              <input id="f_responsavel" type="text" value={data.responsavel} onChange={handleChange} placeholder="Nome do contato principal" />
            </div>
          </div>
          <div className="form-row">
            <div className="field"><label>Cargo / Função</label>
              <input id="f_cargo" type="text" value={data.cargo} onChange={handleChange} placeholder="Ex: Gerente de TI" />
            </div>
            <div className="field"><label>E-mail</label>
              <input id="f_email" type="email" value={data.email} onChange={handleChange} placeholder="contato@laboratorio.com.br" />
            </div>
          </div>
          <div className="form-row">
            <div className="field"><label>Telefone / WhatsApp</label>
              <input id="f_tel" type="text" value={data.tel} onChange={handleChange} placeholder="(00) 00000-0000" />
            </div>
            <div className="field"><label>Data do Pré Kick-Off <span className="req">*</span></label>
              <input id="f_data" type="date" value={data.data} onChange={handleChange} />
            </div>
          </div>
          <div className="form-row full">
            <div className="field"><label>Implantador Responsável</label>
              <input id="f_implantador" type="text" value={data.implantador} onChange={handleChange} placeholder="Seu nome" />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="icon">🔬</span><h2>2. Contexto do Laboratório</h2></div>
        <div className="card-body">
          <div className="field">
            <label>Tipo de Operação <span className="req">*</span></label>
            <div className="tag-group">
              <label className={data.tipo_op.includes('Humano') ? 'checked' : ''}>
                <input type="checkbox" checked={data.tipo_op.includes('Humano')} onChange={() => handleCheckbox('tipo_op', 'Humano')} /> 🧑 Humano
              </label>
              <label className={data.tipo_op.includes('Veterinário') ? 'checked' : ''}>
                <input type="checkbox" checked={data.tipo_op.includes('Veterinário')} onChange={() => handleCheckbox('tipo_op', 'Veterinário')} /> 🐾 Veterinário
              </label>
            </div>
          </div>
          <div className="form-row">
            <div className="field"><label>Nº de Unidades / Filiais</label>
              <input id="f_unidades" type="number" value={data.unidades} onChange={handleChange} min="1" placeholder="Ex: 3" />
            </div>
            <div className="field"><label>Volume Médio de Atendimentos/Dia</label>
              <input id="f_volume" type="text" value={data.volume} onChange={handleChange} placeholder="Ex: 150 atendimentos/dia" />
            </div>
          </div>
          <div className="form-row full">
            <div className="field"><label>Áreas que participam da implantação</label>
              <div className="tag-group">
                {['Recepção', 'Coleta', 'Análise/Laboratório', 'Faturamento', 'TI', 'Gestão/Diretoria'].map(area => (
                  <label key={area} className={data.areas.includes(area) ? 'checked' : ''}>
                    <input type="checkbox" checked={data.areas.includes(area)} onChange={() => handleCheckbox('areas', area)} /> {area}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {data.area_responsibles.length > 0 && (
            <div className="area-resps-container">
              <label className="sub-label">Responsáveis por Setor</label>
              {data.area_responsibles.map((resp, i) => (
                <div key={resp.area} className="area-resp-row">
                  <div className="area-badge" style={{ minWidth: '130px' }}>{resp.area}</div>
                  <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                    <input 
                      type="text" 
                      placeholder="Gerente/Responsável" 
                      value={resp.manager} 
                      onChange={(e) => handleAreaRespChange(i, 'manager', e.target.value)} 
                    />
                  </div>
                  <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                    <input 
                      type="text" 
                      placeholder="Contato (Tel/E-mail)" 
                      value={resp.contact} 
                      onChange={(e) => handleAreaRespChange(i, 'contact', e.target.value)} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="form-row full">
            <div className="field"><label>Observações sobre a operação</label>
              <textarea id="f_obs_contexto" value={data.obs_contexto} onChange={handleChange} placeholder="Detalhes relevantes sobre o funcionamento atual..." />
            </div>
          </div>
        </div>
      </div>

      {/* 3. PROCESSO ATUAL */}
      <div className="card">
        <div className="card-header"><span className="icon">⚙️</span><h2>3. Processo Atual</h2></div>
        <div className="card-body">
          <div className="form-row full">
            <div className="field"><label>Como funciona hoje (do cadastro até o laudo)</label>
              <textarea id="f_processo_atual" value={data.processo_atual} onChange={handleChange} placeholder="Descreva o fluxo atual do cliente..." />
            </div>
          </div>
          <div className="form-row full">
            <div className="field"><label>Maiores gargalos / dores atuais</label>
              <textarea id="f_gargalos" value={data.gargalos} onChange={handleChange} placeholder="Ex: Laudos manuais..." />
            </div>
          </div>
          <div className="form-row full">
            <div className="field"><label>Etapas manuais que precisam ser sistematizadas</label>
              <textarea id="f_etapas_manuais" value={data.etapas_manuais} onChange={handleChange} placeholder="O que hoje é feito no papel..." />
            </div>
          </div>
        </div>
      </div>

      {/* 4. ESCOPO */}
      <div className="card">
        <div className="card-header"><span className="icon">📦</span><h2>4. Escopo da Implantação</h2></div>
        <div className="card-body">
          <div className="form-row full">
            <div className="field"><label>Módulos previstos para o Go-Live</label>
              <div className="tag-group">
                {['Cadastro/Recepção', 'Coleta', 'LIS/Análise', 'Laudos', 'Faturamento', 'Portal de Requisições', 'B2B/Apoio', 'Nota Fiscal', 'Biometria'].map(mod => (
                  <label key={mod} className={data.modulos.includes(mod) ? 'checked' : ''}>
                    <input type="checkbox" checked={data.modulos.includes(mod)} onChange={() => handleCheckbox('modulos', mod)} /> {mod}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="form-row full">
            <div className="field"><label>Módulos / itens para Fase 2 (pós go-live)</label>
              <textarea id="f_fase2" value={data.fase2} onChange={handleChange} placeholder="O que não entra no primeiro go-live..." />
            </div>
          </div>
          <div className="form-row full">
            <div className="field"><label>Customizações já solicitadas / esperadas</label>
              <textarea id="f_custom" value={data.custom} onChange={handleChange} placeholder="Regras específicas..." />
            </div>
          </div>
        </div>
      </div>

      {/* 5. INTEGRAÇÕES */}
      <div className="card">
        <div className="card-header"><span className="icon">🔌</span><h2>5. Integrações e Equipamentos</h2></div>
        <div className="card-body">
          <div className="field">
            <label>Equipamentos que precisam de integração (Interfaceamento)</label>
            <div className="analyzer-list">
              {data.analyzers.map((ana, i) => (
                <div key={i} className="analyzer-row">
                  <input 
                    type="text" 
                    placeholder="Nome do Analisador (Ex: Cobas C303)" 
                    value={ana.name}
                    onChange={(e) => {
                      const newList = [...data.analyzers];
                      newList[i].name = e.target.value;
                      setData({ ...data, analyzers: newList });
                    }}
                  />
                  <input 
                    type="text" 
                    placeholder="Unidade/Local" 
                    value={ana.unit}
                    onChange={(e) => {
                      const newList = [...data.analyzers];
                      newList[i].unit = e.target.value;
                      setData({ ...data, analyzers: newList });
                    }}
                  />
                  <button className="btn-remove" onClick={() => removeAnalyzer(i)}>×</button>
                </div>
              ))}
              <button className="btn-add-lite" onClick={addAnalyzer}>+ Adicionar Analisador</button>
            </div>
          </div>

          <div className="form-row full">
            <div className="field"><label>Integrações com sistemas externos</label>
              <div className="tag-group">
                {['ERP/Financeiro', 'Sistema de terceiro (B2B)', 'Portal do paciente', 'App mobile', 'Nota Fiscal eletrônica', 'Convênios/Planos'].map(integ => (
                  <label key={integ} className={data.integracoes.includes(integ) ? 'checked' : ''}>
                    <input type="checkbox" checked={data.integracoes.includes(integ)} onChange={() => handleCheckbox('integracoes', integ)} /> {integ}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {data.integracoes_detalhes.length > 0 && (
            <div className="integ-details-container">
              <label className="sub-label">Responsáveis Técnicos da Integração</label>
              {data.integracoes_detalhes.map((det, i) => (
                <div key={det.key} className="integ-detail-row">
                  <div className="integ-badge" style={{ minWidth: '130px' }}>{det.key}</div>
                  <div style={{ display: 'flex', flex: 1, gap: '10px' }}>
                    <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                      <input 
                        type="text" 
                        placeholder="Técnico Responsável" 
                        value={det.tech} 
                        onChange={(e) => {
                          const newList = [...data.integracoes_detalhes];
                          newList[i].tech = e.target.value;
                          setData({ ...data, integracoes_detalhes: newList });
                        }} 
                      />
                    </div>
                    <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                      <input 
                        type="text" 
                        placeholder="Contato (Tel/E-mail)" 
                        value={det.contact} 
                        onChange={(e) => {
                          const newList = [...data.integracoes_detalhes];
                          newList[i].contact = e.target.value;
                          setData({ ...data, integracoes_detalhes: newList });
                        }} 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="form-row full">
            <div className="field"><label>Responsável técnico do cliente para integrações</label>
              <input id="f_resp_ti" type="text" value={data.resp_ti} onChange={handleChange} placeholder="Nome e contato do responsável de TI" />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="icon">🛡️</span><h2>6. Infraestrutura</h2></div>
        <div className="card-body">
          <div className="form-row">
            <div className="field">
              <label>Possui Servidor Local/Próprio?</label>
              <select id="f_infra_servidor" value={data.infra_servidor} onChange={handleChange}>
                <option value="Não">Não</option>
                <option value="Sim">Sim</option>
              </select>
            </div>
            {data.infra_servidor === 'Sim' && (
              <div className="field">
                <label>Dados de Acesso (Tipo/VPN)</label>
                <input id="f_infra_acesso" type="text" value={data.infra_acesso} onChange={handleChange} placeholder="Ex: VPN Fortilinux / RDP" />
              </div>
            )}
          </div>
          {data.infra_servidor === 'Sim' && (
            <div className="form-row full">
              <div className="field">
                <label>Especificações do Servidor</label>
                <textarea id="f_infra_specs" value={data.infra_specs} onChange={handleChange} placeholder="CPU, RAM, Disco, SO..." />
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="field">
              <label>Possui Leitor de Código de Barras?</label>
              <select id="f_infra_leitor" value={data.infra_leitor} onChange={handleChange}>
                <option value="Não">Não</option>
                <option value="Sim">Sim</option>
              </select>
            </div>
          </div>

          <div className="field" style={{ marginTop: '20px' }}>
            <label>Impressoras de Etiqueta</label>
            <div className="printer-list">
              {data.printers.map((ptr, i) => (
                <div key={i} className="printer-row">
                  <div className="field">
                    <input 
                      type="number" 
                      placeholder="Qtd" 
                      style={{ width: '60px' }}
                      value={ptr.count}
                      onChange={(e) => {
                        const newList = [...data.printers];
                        newList[i].count = parseInt(e.target.value);
                        setData({ ...data, printers: newList });
                      }}
                    />
                  </div>
                  <div className="field">
                    <select 
                      value={ptr.brand}
                      onChange={(e) => {
                        const newList = [...data.printers];
                        newList[i].brand = e.target.value as any;
                        setData({ ...data, printers: newList });
                      }}
                    >
                      <option value="">Marca</option>
                      <option value="Elgin">Elgin</option>
                      <option value="Zebra">Zebra</option>
                      <option value="Argox">Argox</option>
                    </select>
                  </div>
                  <div className="field" style={{ flex: 2 }}>
                    <input 
                      type="text" 
                      placeholder="Modelo (Ex: L42 Pro)" 
                      value={ptr.model}
                      onChange={(e) => {
                        const newList = [...data.printers];
                        newList[i].model = e.target.value;
                        setData({ ...data, printers: newList });
                      }}
                    />
                  </div>
                  <button className="btn-remove" onClick={() => removePrinter(i)}>×</button>
                </div>
              ))}
              <button className="btn-add-lite" onClick={addPrinter}>+ Adicionar Impressora</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="icon">🗓️</span><h2>7. Cronograma e Disponibilidade</h2></div>
        <div className="card-body">
          <p className="section-hint">Defina os dias e horários previstos para cada etapa:</p>
          
          <ScheduleSelector 
            label="Testes / Configurações de Sistema" 
            days={data.cron_config_days} 
            onChange={(days) => setData({ ...data, cron_config_days: days })} 
          />
          
          <ScheduleSelector 
            label="Testes / Interfaceamento de Equipamentos" 
            days={data.cron_test_interf_days} 
            onChange={(days) => setData({ ...data, cron_test_interf_days: days })} 
          />

          <ScheduleSelector 
            label="Treinamentos de Equipe" 
            days={data.cron_treino_days} 
            onChange={(days) => setData({ ...data, cron_treino_days: days })} 
          />

          <ScheduleSelector 
            label="Testes de Integração" 
            days={data.cron_test_integ_days} 
            onChange={(days) => setData({ ...data, cron_test_integ_days: days })} 
          />

          <div className="disponibilidade-box" style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <div className="field">
              <label>Tipo de Disponibilidade do Cliente (Dedicação ao Projeto)</label>
              <div className="tag-group">
                {['Diária', 'Semanal'].map(t => (
                  <label key={t} className={data.disponibilidade_tipo === t ? 'checked' : ''}>
                    <input 
                      type="radio" 
                      name="disp_tipo" 
                      checked={data.disponibilidade_tipo === t} 
                      onChange={() => setData({ ...data, disponibilidade_tipo: t as any })} 
                    /> {t}
                  </label>
                ))}
              </div>
            </div>

            {data.disponibilidade_tipo === 'Diária' ? (
              <ScheduleSelector 
                label="Disponibilidade Diária" 
                days={data.disponibilidade_config_dias} 
                onChange={(days) => setData({ ...data, disponibilidade_config_dias: days })} 
              />
            ) : (
              <div className="semanal-config">
                <label className="sub-label">Dias de Disponibilidade</label>
                <div className="tag-group">
                  {DAYS.map(d => (
                    <label key={d} className={data.disponibilidade_semanal_dias.includes(d) ? 'checked' : ''}>
                      <input 
                        type="checkbox" 
                        checked={data.disponibilidade_semanal_dias.includes(d)} 
                        onChange={() => {
                          const current = data.disponibilidade_semanal_dias;
                          const updated = current.includes(d) ? current.filter(x => x !== d) : [...current, d];
                          setData({ ...data, disponibilidade_semanal_dias: updated });
                        }} 
                      /> {d}
                    </label>
                  ))}
                </div>
                <div className="form-row" style={{ marginTop: '10px' }}>
                  <div className="field">
                    <label>Horas Disponíveis por Dia</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 4 horas" 
                      value={data.disponibilidade_semanal_horas_dia} 
                      onChange={(e) => setData({ ...data, disponibilidade_semanal_horas_dia: e.target.value })} 
                    />
                  </div>
                  <div className="field">
                    <label>Horas Disponíveis por Semana</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 20 horas" 
                      value={data.disponibilidade_semanal_horas_total} 
                      onChange={(e) => setData({ ...data, disponibilidade_semanal_horas_total: e.target.value })} 
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="icon">🗄️</span><h2>8. Dados e Migração</h2></div>
        <div className="card-body">
          <div className="form-row full">
            <div className="field"><label>Quais cadastros precisam ser importados?</label>
              <div className="tag-group">
                {['Pacientes/Clientes', 'Convênios/Planos', 'Exames/Tabela de preços', 'Médicos solicitantes'].map(mig => (
                  <label key={mig} className={data.migracao.includes(mig) ? 'checked' : ''}>
                    <input type="checkbox" checked={data.migracao.includes(mig)} onChange={() => handleCheckbox('migracao', mig)} /> {mig}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="form-row full">
            <div className="field">
              <label>Quantidade de Convênios Atendidos</label>
              <input id="f_migracao_convenios_qtd" type="text" value={data.migracao_convenios_qtd} onChange={handleChange} placeholder="Ex: 40 convênios" />
            </div>
          </div>
          <div className="form-row">
            <div className="field"><label>Qualidade estimada da base atual</label>
              <select id="f_qualidade_base" value={data.qualidade_base} onChange={handleChange}>
                <option value="">— Selecione —</option>
                <option>Boa (organizada, poucos ajustes)</option>
                <option>Regular (precisa de limpeza)</option>
                <option>Ruim (muitos erros e duplicados)</option>
                <option>Não possui base digital</option>
              </select>
            </div>
            <div className="field"><label>Prazo limite para entrega das bases</label>
              <input id="f_prazo_base" type="date" value={data.prazo_base} onChange={handleChange} />
            </div>
          </div>
          <div className="form-row full">
            <div className="field"><label>Quem será responsável por revisar/limpar os dados?</label>
              <input id="f_resp_dados" type="text" value={data.resp_dados} onChange={handleChange} placeholder="Nome e área responsável" />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="icon">👥</span><h2>9. Pessoas e Responsabilidades</h2></div>
        <div className="card-body">
          <div className="form-row">
            <div className="field"><label>Sponsor / Patrocinador do Projeto</label>
              <input id="f_sponsor" type="text" value={data.sponsor} onChange={handleChange} placeholder="Quem aprova" />
            </div>
            <div className="field"><label>Aprovador Funcional</label>
              <input id="f_aprovador" type="text" value={data.aprovador} onChange={handleChange} placeholder="Quem valida requisitos" />
            </div>
          </div>
          <div className="form-row">
            <div className="field"><label>Responsável por Testes / Homologação</label>
              <input id="f_resp_teste" type="text" value={data.resp_teste} onChange={handleChange} placeholder="Quem valida o sistema" />
            </div>
            <div className="field"><label>Responsável pelo Treinamento Interno</label>
              <input id="f_resp_treinamento" type="text" value={data.resp_treinamento} onChange={handleChange} placeholder="Quem multiplicará" />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="icon">📅</span><h2>10. Prazos e Disponibilidade Geral</h2></div>
        <div className="card-body">
          <div className="form-row">
            <div className="field"><label>Data desejada para Go-Live (VIRADA DO SISTEMA)</label>
              <input id="f_golive" type="date" value={data.golive} onChange={handleChange} />
            </div>
          </div>
          <div className="form-row full">
            <div className="field">
              <label>Disponibilidade de reuniões</label>
              <ScheduleSelector 
                label="" 
                days={data.reunioes_config} 
                onChange={(days) => setData({ ...data, reunioes_config: days })} 
              />
            </div>
          </div>
          <div className="form-row full">
            <div className="field"><label>Períodos críticos (evitar implantar)</label>
              <textarea id="f_periodos_criticos" value={data.periodos_criticos} onChange={handleChange} placeholder="Ex: fechamento de balanço..." />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="icon">⚠️</span><h2>11. Riscos e Pontos de Atenção</h2></div>
        <div className="card-body">
          <div id="riscos-container">
            {data.riscos.map((risco, index) => (
              <div key={index} className="risk-row" style={{ marginTop: index > 0 ? '10px' : 0 }}>
                <textarea className="risco-desc" value={risco.desc} onChange={(e) => handleRiscoChange(index, 'desc', e.target.value)} placeholder="Descreva o risco..." rows={2} />
                <select className="risco-nivel" value={risco.nivel} onChange={(e) => handleRiscoChange(index, 'nivel', e.target.value)}>
                  <option value="Alta">Alta</option>
                  <option value="Média">Média</option>
                  <option value="Baixa">Baixa</option>
                </select>
              </div>
            ))}
          </div>
          <button className="btn-add" onClick={addRisco}>+ Adicionar Risco</button>
          <div className="form-row full" style={{ marginTop: '14px' }}>
            <div className="field"><label>O que seria considerado sucesso no 1º mês?</label>
              <textarea id="f_sucesso" value={data.sucesso} onChange={handleChange} placeholder="Critérios de sucesso..." />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="icon">📝</span><h2>12. Observações Finais</h2></div>
        <div className="card-body">
          <div className="form-row full">
            <div className="field"><label>Processos fora do padrão</label>
              <textarea id="f_fora_padrao" value={data.fora_padrao} onChange={handleChange} placeholder="Regras específicas..." />
            </div>
          </div>
          <div className="form-row">
            <div className="field"><label>Data prevista para Kick-Off</label>
              <input id="f_kickoff_date" type="date" value={data.kickoff_date} onChange={handleChange} />
            </div>
            <div className="field"><label>Formato do Kick-Off</label>
              <select id="f_kickoff_format" value={data.kickoff_format} onChange={handleChange}>
                <option value="">— Selecione —</option>
                <option>Presencial</option>
                <option>Online (Videoconferência)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="actions">
        <button className="btn-back" style={{ padding: '12px 24px', marginRight: 'auto' }} onClick={onCancel}>Cancelar</button>
        <button className="btn-preview" onClick={() => setMode('preview')}>👁️ Prévia</button>
        <button className="btn-pdf" onClick={() => { setMode('preview'); setTimeout(() => window.print(), 300); }}>📄 Imprimir</button>
        <button className="btn-pdf" style={{ background: '#14532d' }} onClick={() => onSave(data)}>💾 Salvar Documento</button>
      </div>
    </div>
  );
};

export default PreKickoffForm;
