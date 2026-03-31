import React, { useState, useEffect } from 'react';
import '../styles/form.css';

import { FormData, SavedDoc, Risk } from '../types';

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
  obs_contexto: '',
  processo_atual: '',
  gargalos: '',
  etapas_manuais: '',
  modulos: [],
  fase2: '',
  custom: '',
  equipamentos: '',
  integracoes: [],
  resp_ti: '',
  migracao: [],
  qualidade_base: '',
  prazo_base: '',
  resp_dados: '',
  sponsor: '',
  aprovador: '',
  resp_teste: '',
  resp_treinamento: '',
  golive: '',
  disponibilidade: '',
  periodos_criticos: '',
  prazo_contrato: '',
  riscos: [{ desc: '', nivel: 'Média' }],
  sucesso: '',
  fora_padrao: '',
  pendencias: '',
  kickoff_date: '',
  kickoff_format: '',
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
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setData({ ...data, [name]: updated });
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
              <p>{data.nome || '(cliente não informado)'} &nbsp;|&nbsp; Implantação de Sistema Laboratorial</p>
            </div>
            <div className="doc-meta">
              <strong>{data.nome || '(cliente não informado)'}</strong>
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
              {renderCell('Implantador', data.implantador, true)}
            </div>
          </div>

          <div className="doc-section">
            <h2>🔬 Contexto do Laboratório</h2>
            <div className="doc-grid">
              {renderCell('Tipo de Operação', data.tipo_op)}
              {renderCell('Nº de Unidades', data.unidades)}
              {renderCell('Volume Médio/Dia', data.volume)}
              {renderCell('Áreas Envolvidas', data.areas)}
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
            <div className="doc-grid full">
              {renderCell('Equipamentos para Interfaceamento', data.equipamentos, true)}
              {renderCell('Integrações com Sistemas Externos', data.integracoes, true)}
              {renderCell('Responsável Técnico (TI do Cliente)', data.resp_ti, true)}
            </div>
          </div>

          <div className="doc-section">
            <h2>🗄️ Dados e Migração</h2>
            <div className="doc-grid">
              {renderCell('Cadastros para Importar', data.migracao)}
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
            <h2>📅 Prazos e Disponibilidade</h2>
            <div className="doc-grid">
              {renderCell('Data Desejada Go-Live', fmtDate(data.golive))}
              {renderCell('Disponibilidade', data.disponibilidade)}
              {renderCell('Períodos Críticos', data.periodos_criticos)}
              {renderCell('Impactos Contratuais', data.prazo_contrato)}
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
            <div>Documento gerado em {hoje} &nbsp;|&nbsp; Uso interno — Implantação de Sistema Laboratorial</div>
            <div className="sig-box">
              Implantador Responsável<br /><small>{data.implantador || '___________________'}</small>
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
          <div className="form-row full">
            <div className="field"><label>Equipamentos que precisam de integração (Interfaceamento)</label>
              <textarea id="f_equipamentos" value={data.equipamentos} onChange={handleChange} placeholder="Ex: Cobas C303..." />
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
          <div className="form-row full">
            <div className="field"><label>Responsável técnico do cliente para integrações</label>
              <input id="f_resp_ti" type="text" value={data.resp_ti} onChange={handleChange} placeholder="Nome e contato do responsável de TI" />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="icon">🗄️</span><h2>6. Dados e Migração</h2></div>
        <div className="card-body">
          <div className="form-row full">
            <div className="field"><label>Quais cadastros precisam ser importados?</label>
              <div className="tag-group">
                {['Pacientes/Clientes', 'Convênios/Planos', 'Exames/Tabela de preços', 'Médicos solicitantes', 'Histórico de laudos'].map(mig => (
                  <label key={mig} className={data.migracao.includes(mig) ? 'checked' : ''}>
                    <input type="checkbox" checked={data.migracao.includes(mig)} onChange={() => handleCheckbox('migracao', mig)} /> {mig}
                  </label>
                ))}
              </div>
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
        <div className="card-header"><span className="icon">👥</span><h2>7. Pessoas e Responsabilidades</h2></div>
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
        <div className="card-header"><span className="icon">📅</span><h2>8. Prazos e Disponibilidade</h2></div>
        <div className="card-body">
          <div className="form-row">
            <div className="field"><label>Data desejada para Go-Live</label>
              <input id="f_golive" type="date" value={data.golive} onChange={handleChange} />
            </div>
            <div className="field"><label>Disponibilidade de reuniões</label>
              <input id="f_disponibilidade" type="text" value={data.disponibilidade} onChange={handleChange} placeholder="Ex: terças e quintas" />
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
        <div className="card-header"><span className="icon">⚠️</span><h2>9. Riscos e Pontos de Atenção</h2></div>
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
        <div className="card-header"><span className="icon">📝</span><h2>10. Observações Finais</h2></div>
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
