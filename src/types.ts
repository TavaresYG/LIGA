export interface Risk {
  desc: string;
  nivel: string;
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
  obs_contexto: string;
  processo_atual: string;
  gargalos: string;
  etapas_manuais: string;
  modulos: string[];
  fase2: string;
  custom: string;
  equipamentos: string;
  integracoes: string[];
  resp_ti: string;
  migracao: string[];
  qualidade_base: string;
  prazo_base: string;
  resp_dados: string;
  sponsor: string;
  aprovador: string;
  resp_teste: string;
  resp_treinamento: string;
  golive: string;
  disponibilidade: string;
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
