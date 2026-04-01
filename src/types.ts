export interface Risk {
  desc: string;
  nivel: string;
}

export interface AreaResponsible {
  area: string;
  manager: string;
  contact: string;
}

export interface Analyzer {
  name: string;
  unit: string;
}

export interface PrinterInfo {
  count: number;
  brand: 'Elgin' | 'Zebra' | 'Argox' | '';
  model: string;
}

export interface DaySchedule {
  day: string;
  start: string;
  end: string;
}

export interface IntegrationDetailEntry {
  key: string;
  tech: string;
  contact: string;
}

export interface FormData {
  nome: string;
  responsavel: string;
  cargo: string;
  email: string;
  tel: string;
  data: string;
  implantador: string;
  tipo_op: string[];
  unidades: string;
  volume: string;
  areas: string[];
  area_responsibles: AreaResponsible[];
  obs_contexto: string;
  processo_atual: string;
  gargalos: string;
  etapas_manuais: string;
  modulos: string[];
  fase2: string;
  custom: string;
  equipamentos: string;
  analyzers: Analyzer[];
  integracoes: string[];
  integracoes_detalhes: IntegrationDetailEntry[];
  resp_ti: string;
  infra_servidor: string; // 'Sim' | 'Não'
  infra_acesso: string;
  infra_specs: string;
  infra_leitor: string; // 'Sim' | 'Não'
  printers: PrinterInfo[];
  cron_config_days: DaySchedule[];
  cron_config_resp: string;
  cron_test_interf_days: DaySchedule[];
  cron_test_interf_resp: string;
  cron_treino_days: DaySchedule[];
  cron_treino_resp: string;
  cron_test_integ_days: DaySchedule[];
  cron_test_integ_resp: string;
  disponibilidade_tipo: 'Diária' | 'Semanal';
  disponibilidade_config_dias: DaySchedule[];
  disponibilidade_semanal_dias: string[];
  disponibilidade_semanal_horas_dia: string;
  disponibilidade_semanal_horas_total: string;
  migracao: string[];
  migracao_convenios_qtd: string;
  qualidade_base: string;
  prazo_base: string;
  resp_dados: string;
  sponsor: string;
  aprovador: string;
  resp_teste: string;
  resp_treinamento: string;
  golive: string;
  disponibilidade: string;
  reunioes_config: DaySchedule[];
  periodos_criticos: string;
  prazo_contrato: string;
  riscos: Risk[];
  sucesso: string;
  fora_padrao: string;
  pendencias: string;
  kickoff_date: string;
  kickoff_format: string;
}

export interface SavedDoc {
  id: string;
  type: 'pre-kickoff';
  clientName: string;
  date: string;
  implantador: string;
  data: FormData;
  createdAt: string;
}
