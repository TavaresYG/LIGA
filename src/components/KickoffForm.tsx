import React, { useState } from 'react';
import '../styles/form.css';
import { FormData, SavedDoc, Risk, DaySchedule } from '../types';

interface KickoffFormProps {
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
  riscos: [{ desc: '', nivel: 'Média' }],
  sucesso: '',
  fora_padrao: '',
  pendencias: '',
  kickoff_date: '',
  kickoff_format: '',
};

const KickoffForm: React.FC<KickoffFormProps> = ({ initialData, onSave, onCancel }) => {
  const [data, setData] = useState<FormData>(initialData || defaultData);
  const [mode, setMode] = useState<'form' | 'preview'>('form');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    const key = id.startsWith('f_') ? id.substring(2) : id;
    setData({ ...data, [key]: value });
  };

  const handleCheckbox = (name: keyof FormData, value: string) => {
    const current = data[name] as string[];
    const isAdding = !current.includes(value);
    const updated = isAdding ? [...current, value] : current.filter((v) => v !== value);
    setData({ ...data, [name]: updated });
  };

  if (mode === 'preview') {
    return (
      <div className="pdf-screen">
        <div className="pdf-toolbar">
          <button className="btn-back" onClick={() => setMode('form')}>← Voltar</button>
          <button className="btn-print" onClick={() => window.print()}>🖨️ Imprimir PDF</button>
        </div>
        <div className="doc">
           <div className="doc-header">
             <h1>🚀 Documento de Kick-Off Oficial</h1>
             <p>Este formulário é uma cópia do Pré Kick-Off para fins de registro oficial.</p>
           </div>
           <div className="doc-section">
             <h2>🏷️ Identificação</h2>
             <p><strong>Laboratório:</strong> {data.nome}</p>
             <p><strong>Implantador:</strong> {data.implantador}</p>
           </div>
           {/* Resumo simplificado para o exemplo */}
           <p style={{marginTop: '20px', fontStyle: 'italic'}}>Os demais campos seguem o padrão do sistema.</p>
        </div>
      </div>
    );
  }

  return (
    <div id="form-screen">
      <div className="page-header">
        <h1>Formulário de Kick-Off</h1>
        <p>Preencha os dados oficiais para a reunião de abertura do projeto.</p>
      </div>

      <div className="card">
        <div className="card-header"><h2>1. Dados do Projeto</h2></div>
        <div className="card-body">
           <div className="field">
             <label>Nome do Laboratório</label>
             <input id="f_nome" type="text" value={data.nome} onChange={handleChange} />
           </div>
           <div className="field">
             <label>Implantador</label>
             <input id="f_implantador" type="text" value={data.implantador} onChange={handleChange} />
           </div>
        </div>
      </div>

      <div className="form-actions">
        <button className="btn-cancel" onClick={onCancel}>Cancelar</button>
        <button className="btn-preview" onClick={() => setMode('preview')}>Visualizar PDF</button>
        <button className="btn-save" onClick={() => onSave(data)}>Salvar Kick-Off</button>
      </div>
    </div>
  );
};

export default KickoffForm;
