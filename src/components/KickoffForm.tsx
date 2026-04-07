import React, { useState, useRef, useEffect } from 'react';
import '../styles/form.css';
import { FormData, SavedDoc, Risk, DaySchedule } from '../types';
import { X, CheckCircle, FileSignature, Paperclip, Unlock, Plus, Trash2, FileText, ImageIcon } from 'lucide-react';

interface KickoffFormProps {
  initialData?: FormData;
  onSave: (doc: FormData) => void;
  onCancel: () => void;
}

// Singleton para evitar recarregamento da biblioteca
let pdfjsCache: any = null;

const PDFPages: React.FC<{ url: string }> = ({ url }) => {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPDF = async () => {
      try {
        let pdfjs = pdfjsCache;
        if (!pdfjs) {
          // Importa a biblioteca de um CDN confiável
          pdfjs = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.1.392/pdf.min.mjs');
          pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.1.392/pdf.worker.min.mjs`;
          pdfjsCache = pdfjs;
        }
        
        const loadingTask = pdfjs.getDocument(url);
        const pdf = await loadingTask.promise;
        const pageImages: string[] = [];
        setProgress({ current: 0, total: pdf.numPages });

        for (let i = 1; i <= pdf.numPages; i++) {
          setProgress(prev => ({ ...prev, current: i }));
          const page = await pdf.getPage(i);
          // Escala 1.5 é o equilíbrio perfeito entre qualidade de impressão (300dpi aprox) e velocidade
          const viewport = page.getViewport({ scale: 1.5 }); 
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          if (context) {
            await page.render({ canvasContext: context, viewport }).promise;
            pageImages.push(canvas.toDataURL('image/jpeg', 0.8));
          }
        }
        setImages(pageImages);
      } catch (err: any) {
        console.error("Erro ao renderizar PDF:", err);
        setError("Ocorreu um erro ao processar as páginas do PDF. Verifique se o arquivo está correto.");
      } finally {
        setLoading(false);
      }
    };
    loadPDF();
  }, [url]);

  if (error) return <div className="pdf-error" style={{ color: '#ef4444', padding: '15px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fee2e2', fontSize: '13px' }}>⚠️ {error}</div>;
  if (loading) return (
    <div className="pdf-loading" style={{ padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
      <div style={{ marginBottom: '10px', fontWeight: 600, color: '#475569' }}>⏳ Processando Anexo...</div>
      <div style={{ fontSize: '13px', color: '#64748b' }}>Renderizando página {progress.current} de {progress.total}</div>
      <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
        <div style={{ width: `${(progress.current / (progress.total || 1)) * 100}%`, height: '100%', background: '#3b82f6', transition: 'width 0.3s' }}></div>
      </div>
    </div>
  );

  return (
    <>
      {images.map((img, idx) => (
        <div key={idx} className="doc-section doc-page-break" style={{ border: 'none', padding: 0 }}>
          <img src={img} alt={`Página ${idx + 1}`} style={{ width: '100%', display: 'block' }} />
        </div>
      ))}
    </>
  );
};
const ProcessFlow: React.FC = () => (
  <div style={{ marginTop: '20px' }}>
    <label className="sub-label">Fluxo do Processo</label>
    <div className="process-flow">
      <div className="flow-step">
        <div className="flow-icon"><CheckCircle size={24} /></div>
        <div className="flow-text">Etapa Concluída</div>
      </div>
      <div className="flow-arrow">→</div>
      <div className="flow-step">
        <div className="flow-icon"><FileSignature size={24} /></div>
        <div className="flow-text">Termo Assinado</div>
      </div>
      <div className="flow-arrow">→</div>
      <div className="flow-step">
        <div className="flow-icon"><Paperclip size={24} /></div>
        <div className="flow-text">Anexado na Ferramenta</div>
      </div>
      <div className="flow-arrow">→</div>
      <div className="flow-step" style={{ flex: 1.2 }}>
        <div className="flow-icon" style={{ background: '#059669' }}><Unlock size={24} /></div>
        <div className="flow-text" style={{ color: '#059669' }}>Próxima Etapa Liberada</div>
      </div>
    </div>
  </div>
);

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
  kickoff_time: '',
  kickoff_format: '',
  dinamica_implantacao: 'A dinâmica de implantação prioriza a autonomia total do laboratório. A LIGA fornece a licença de uso do software, mas a responsabilidade pela configuração fica com a equipe do laboratório. Durante todo o processo, nosso time acompanhará de perto, oferecendo capacitação e suporte para garantir que vocês realizem todos os ajustes necessários com independência.',
  comunicacao_oficial: 'Será criado um grupo oficial de implantação no WhatsApp, onde toda comunicação deverá ser centralizada durante nosso projeto de implantação, a comunicação nunca deve ocorrer em mensagens privadas. Isso garante que toda a equipe acompanhe o andamento de cada etapa em tempo real.\n\nRegras do Grupo:\n- Mesmo sendo WhatsApp, aqui nós trabalhamos com 100% de agendamentos para manter previsibilidade e organização.\n- Vocês podem enviar mensagens a qualquer horário.\n- As respostas não ocorrem necessariamente em tempo real, porque operamos com sistema de agendamentos. O analista responsável pelo projeto de vocês pode estar realizando ajustes internos ou atendendo simultaneamente diversos projetos.\n- Mensagens enviadas em finais de semana, feriados ou após o horário do setor de implantação serão respondidas no próximo dia útil.',
  agendamentos_reunioes: 'Todos os agendamentos contam com tolerância de 15 minutos. Caso a equipe não compareça, a reunião será remarcada para outra data, preservando os cronogramas dos demais projetos.\n\nRegras de Horário:\n- Início: horário agendado\n- Tolerância: +15 minutos\n- Fim: horário máximo definido\n- Não comparecimento: remarcada automaticamente',
  validacoes_andamento: 'Sempre após cada etapa concluída, nós coletaremos um termo de aceite para formalizar o progresso na nossa ferramenta de projetos. Nosso sistema só libera as próximas etapas para os analistas após o termo ser anexado, sinalizando a finalização.',
  validacoes_pos_fluxo: 'Esclarecimento Importante:\nO termo é apenas formalização administrativa. Em qualquer momento, temos total disponibilidade para instruir, acompanhar e oferecer suporte técnico necessário.\n\nObjetivo:\nGarantir rastreabilidade completa do projeto e manter todos os cronogramas alinhados entre as equipes.',
  rotina_semanal: 'Segunda-feira: Enviamos o planejamento da semana com todas as atividades previstas.\n\nSexta-feira: Entregamos o relatório semanal com o resumo dos ajustes realizados durante a semana.',
  rotina_envio_modo: '',
  rotina_envio_emails: '',
  rotina_envio_whatsapps: '',
  rotina_envio_outro: '',
  horario_setor: '07:30 até 16:00',
  base_padrao: 'Fornecemos uma base padrão de implantação com aproximadamente 1000 exames, sendo 350 exames pré-configurados, incluindo laudos internos com metodologia, nome dos exames, mnemônicos padrões e referências atualizadas com base no Hermes Pardini (que foram recentemente revisadas).\n\nEsses 350 exames vêm preparados para ativação imediata, com a integração pronta faltando somente ajusar as credenciais de Web Service caso seja necessário o envio para o laboratório de apoio, basta o laboratório selecionar os que serão enviados para o apoio e escolher o formato de retorno dos resultados (descritivo ou PDF);\n\nOBS: Para os exames produzidor internamente, caso usem analisadores ou reagentes diferentes que impactem nos valores de referências, nós definimos em conjunto com o laboratório os usuários que terão acesso para poder ajustar as referências específicas conforme necessário (Nessa parte é recomendado que sejam poucas pessoas com esse nível de acesso)',
  documentos_adicionais: [],
};

const KickoffForm: React.FC<KickoffFormProps> = ({ initialData, onSave, onCancel }) => {
  const [data, setData] = useState<FormData>({ ...defaultData, ...initialData });
  const [mode, setMode] = useState<'form' | 'preview'>('form');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    const key = id.startsWith('f_') ? id.substring(2) : id;
    setData({ ...data, [key]: value });
  };

  if (mode === 'preview') {
    const hoje = new Date().toLocaleDateString('pt-BR');
    const fmtDate = (s: string) => {
      if (!s) return '';
      const [y, m, d] = s.split('-');
      return `${d}/${m}/${y}`;
    };

    return (
      <div className="pdf-screen">
        <div className="pdf-toolbar">
          <button className="btn-back" onClick={() => setMode('form')}>← Voltar</button>
          <button className="btn-print" onClick={() => window.print()}>🖨️ Imprimir PDF</button>
        </div>
        <div className="doc">
           <div className="doc-header">
             <div className="doc-title">
               <h1>🚀 Documento de Kick-Off Oficial</h1>
               <p>Reunião de Abertura do Projeto de Implantação</p>
             </div>
             <div className="doc-meta">
               <strong>{data.nome || '(cliente não informado)'}</strong><br />
               <span>Implantador: <strong>{data.implantador || 'Não informado'}</strong></span><br />
               Data do Kick-Off: {fmtDate(data.data) || hoje}<br />
               Gerado em: {hoje}
             </div>
           </div>
           
           <div className="doc-section">
             <h2>🏷️ Identificação</h2>
             <div className="doc-grid">
               <div className="doc-cell"><label>Laboratório</label><span>{data.nome || 'Não informado'}</span></div>
               <div className="doc-cell"><label>Responsável</label><span>{data.responsavel || 'Não informado'}</span></div>
               <div className="doc-cell"><label>Cargo</label><span>{data.cargo || 'Não informado'}</span></div>
               <div className="doc-cell"><label>E-mail</label><span>{data.email || 'Não informado'}</span></div>
               <div className="doc-cell"><label>Telefone</label><span>{data.tel || 'Não informado'}</span></div>
               <div className="doc-cell"><label>Data</label><span>{data.data || 'Não informado'}</span></div>
               <div className="doc-cell full"><label>Implantador</label><span>{data.implantador || 'Não informado'}</span></div>
             </div>
           </div>

           <div className="doc-section">
             <h2>⚙️ Dinâmica de Implantação</h2>
             <div className="doc-grid full">
                <div className="doc-cell full">
                  <label>Horário do setor de implantação</label>
                  <span>{data.horario_setor || 'Não informado'}</span>
                </div>
                <div className="doc-cell full" style={{ borderTop: '1px solid #e2e8f0' }}>
                  <label>Como funcionará o projeto</label>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{data.dinamica_implantacao || 'Não informado'}</span>
                </div>
                <div className="doc-cell full" style={{ borderTop: '1px solid #e2e8f0' }}>
                  <label>Base Padrão de Implantação</label>
                  <span style={{ whiteSpace: 'pre-wrap', fontSize: '11px' }}>{data.base_padrao || 'Não informado'}</span>
                </div>
             </div>
           </div>

           <div className="doc-section">
             <h2>💬 Comunicação Oficial</h2>
             <div className="doc-grid full">
               <div className="doc-cell full">
                 <label>Diretrizes de Comunicação</label>
                 <span style={{ whiteSpace: 'pre-wrap' }}>{data.comunicacao_oficial || 'Não informado'}</span>
               </div>
             </div>
           </div>

           <div className="doc-section">
             <h2>🗓️ Agendamentos e Reuniões</h2>
             <div className="doc-grid full">
               <div className="doc-cell full">
                 <label>Regras de Compromissos</label>
                 <span style={{ whiteSpace: 'pre-wrap' }}>{data.agendamentos_reunioes || 'Não informado'}</span>
               </div>
             </div>
           </div>

           <div className="doc-section">
             <h2>✅ Validações do Andamento</h2>
             <div className="doc-grid full">
               <div className="doc-cell full">
                 <label>Fluxo de Aprovação e Termos de Aceite</label>
                 <span style={{ whiteSpace: 'pre-wrap' }}>{data.validacoes_andamento || 'Não informado'}</span>
               </div>
             </div>
             <ProcessFlow />
             <div className="doc-grid full" style={{ marginTop: '10px', borderTop: 'none' }}>
               <div className="doc-cell full">
                 <span style={{ whiteSpace: 'pre-wrap', fontSize: '11px', color: '#475569' }}>{data.validacoes_pos_fluxo || ''}</span>
               </div>
             </div>
           </div>

           <div className="doc-section">
             <h2>📅 Rotina Semanal de Implantação</h2>
             <div className="doc-grid full">
               <div className="doc-cell full">
                 <label>Cronograma de Entregas</label>
                 <span style={{ whiteSpace: 'pre-wrap', fontSize: '11px', color: '#475569' }}>{data.rotina_semanal || 'Não informado'}</span>
               </div>
               <div className="doc-cell full" style={{ borderTop: '1px solid #e2e8f0' }}>
                 <label>Modo de Recebimento</label>
                 <span style={{ fontSize: '11px' }}>
                    <strong>{data.rotina_envio_modo === 'email' ? 'Por e-mail' : 
                            data.rotina_envio_modo === 'whatsapp' ? 'Pelo grupo WhatsApp' : 
                            data.rotina_envio_modo === 'ambos' ? 'Ambos (E-mail e WhatsApp)' : 
                            data.rotina_envio_modo === 'outro' ? 'Outra preferência' : 'Não informado'}</strong>
                 </span>
                 {data.rotina_envio_emails && (
                   <div style={{ marginTop: '5px', fontSize: '11px' }}>
                     <label style={{ fontSize: '9px', opacity: 0.7 }}>E-mails:</label> <span>{data.rotina_envio_emails}</span>
                   </div>
                 )}
                 {data.rotina_envio_whatsapps && (
                   <div style={{ marginTop: '5px', fontSize: '11px' }}>
                     <label style={{ fontSize: '9px', opacity: 0.7 }}>WhatsApp/Números:</label> <span>{data.rotina_envio_whatsapps}</span>
                   </div>
                 )}
                 {data.rotina_envio_outro && (
                   <div style={{ marginTop: '5px', fontSize: '11px' }}>
                     <label style={{ fontSize: '9px', opacity: 0.7 }}>Detalhes:</label> <span style={{ whiteSpace: 'pre-wrap' }}>{data.rotina_envio_outro}</span>
                   </div>
                 )}
               </div>
             </div>
           </div>

           {/* Anexos: Renderizados antes das assinaturas finais */}
           {data.documentos_adicionais && data.documentos_adicionais.length > 0 && (
              <div className="doc-attachments-preview">
                {data.documentos_adicionais.map((doc) => (
                  <div key={doc.id} className="attachment-wrapper">
                    <div className="attachment-header-title" style={{ 
                      marginTop: '30px', 
                      padding: '10px', 
                      background: '#f8fafc', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#475569',
                      pageBreakBefore: 'always'
                    }}>
                      📎 Anexo: {doc.name}
                    </div>
                    {doc.type === 'image' ? (
                      <div className="doc-section" style={{ border: 'none', padding: 0 }}>
                        <img src={doc.url} alt={doc.name} style={{ width: '100%', display: 'block', marginTop: '10px' }} />
                      </div>
                    ) : (
                      <PDFPages url={doc.url} />
                    )}
                  </div>
                ))}
              </div>
            )}

           {/* Assinaturas: Agora no FINAL absoluto do documento */}
           {/* Seção de Fechamento e Assinaturas */}
           <div className="doc-section doc-page-break" style={{ border: 'none', marginTop: '40px', pageBreakBefore: 'always' }}>
             <div style={{ 
               padding: '25px', 
               background: '#f8fafc', 
               border: '1px solid #e2e8f0', 
               borderRadius: '12px',
               marginBottom: '40px'
             }}>
               <h2 style={{ color: '#1e293b', marginBottom: '15px' }}>🤝 Compromisso de Implantação</h2>
               <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.6', marginBottom: '20px' }}>
                 Com a assinatura deste documento, as partes confirmam estar alinhadas com o cronograma, as diretrizes de comunicação 
                 e a dinâmica de implantação apresentadas neste Kick-Off. Nosso objetivo comum é garantir uma transição suave, 
                 autônoma e eficiente para a utilização plena do software LIGA no laboratório.
               </p>
               
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                 <div style={{ padding: '15px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                   <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', marginBottom: '10px' }}>📋 Próximos Passos</h3>
                   <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: '#1e293b' }}>
                     <li style={{ marginBottom: '5px' }}>Criação do canal oficial de comunicação (WhatsApp).</li>
                     <li style={{ marginBottom: '5px' }}>Configuração inicial da Base Padrão de Implantação.</li>
                     <li style={{ marginBottom: '5px' }}>Início do cronograma de reuniões agendadas.</li>
                   </ul>
                 </div>
                 <div style={{ padding: '15px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                   <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', marginBottom: '10px' }}>💡 Lembrete Importante</h3>
                   <p style={{ margin: 0, fontSize: '11px', color: '#1e293b' }}>
                     Toda a comunicação e agendamentos serão centralizados no grupo oficial. Lembre-se da tolerância de 15 minutos para reuniões.
                   </p>
                 </div>
               </div>
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
        <h1>Formulário de Kick-Off</h1>
        <p>Preencha os dados oficiais para a reunião de abertura do projeto.</p>
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
            <div className="field"><label>Data do Kick-Off <span className="req">*</span></label>
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
        <div className="card-header"><span className="icon">⚙️</span><h2>2. Dinâmica de Implantação</h2></div>
        <div className="card-body">
          <div className="form-row full">
            <div className="field">
              <label>Horário do setor de implantação</label>
              <input 
                id="f_horario_setor" 
                type="text" 
                value={data.horario_setor} 
                onChange={handleChange} 
                placeholder="Ex: 07:30 até 16:00" 
              />
            </div>
          </div>
          <div className="form-row full" style={{ marginTop: '15px' }}>
            <div className="field">
              <label>Descrição da Dinâmica</label>
              <textarea 
                id="f_dinamica_implantacao" 
                value={data.dinamica_implantacao} 
                onChange={handleChange} 
                placeholder="Regras da dinâmica de implantação..." 
                rows={5}
              />
            </div>
          </div>
          <div className="form-row full" style={{ marginTop: '15px' }}>
            <div className="field">
              <label>Base Padrão de Implantação</label>
              <textarea 
                id="f_base_padrao" 
                value={data.base_padrao} 
                onChange={handleChange} 
                placeholder="Detalhes da base padrão..." 
                rows={18}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="icon">💬</span><h2>3. Comunicação Oficial</h2></div>
        <div className="card-body">
          <div className="form-row full">
            <div className="field">
              <label>Regras do WhatsApp e Centralização</label>
              <textarea 
                id="f_comunicacao_oficial" 
                value={data.comunicacao_oficial} 
                onChange={handleChange} 
                placeholder="Regras de comunicação..." 
                rows={16}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="icon">🗓️</span><h2>4. Agendamentos e Reuniões</h2></div>
        <div className="card-body">
          <div className="form-row full">
            <div className="field">
              <label>Tolerância e Regras de Horário</label>
              <textarea 
                id="f_agendamentos_reunioes" 
                value={data.agendamentos_reunioes} 
                onChange={handleChange} 
                placeholder="Regras de agendamento..." 
                rows={8}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="icon">✅</span><h2>5. Validações do Andamento</h2></div>
        <div className="card-body">
          <div className="form-row full">
            <div className="field">
              <label>Formalização de Conclusão e Termos</label>
               <textarea 
                id="f_validacoes_andamento" 
                value={data.validacoes_andamento} 
                onChange={handleChange} 
                placeholder="Regras de validação..." 
                rows={7}
              />
            </div>
          </div>
          <ProcessFlow />
          <div className="form-row full" style={{ marginTop: '15px' }}>
            <div className="field">
              <label>Esclarecimentos e Objetivos Adicionais</label>
              <textarea 
                id="f_validacoes_pos_fluxo" 
                value={data.validacoes_pos_fluxo} 
                onChange={handleChange} 
                placeholder="Objetivos e esclarecimentos..." 
                rows={8}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="icon">📅</span><h2>6. Rotina Semanal de Implantação</h2></div>
        <div className="card-body">
          <div className="form-row full">
            <div className="field">
              <label>Compromissos de Planejamento e Entrega de Relatórios</label>
              <textarea 
                id="f_rotina_semanal" 
                value={data.rotina_semanal} 
                onChange={handleChange} 
                placeholder="Detalhes da rotina semanal..." 
                rows={5}
              />
            </div>
          </div>

          <div className="form-row full" style={{ marginTop: '15px' }}>
            <div className="field">
              <label>Como o cliente deseja receber essas informações?</label>
              <div className="tag-group">
                {[
                  { id: 'email', label: 'Por e-mail' },
                  { id: 'whatsapp', label: 'Pelo grupo WhatsApp' },
                  { id: 'ambos', label: 'Ambos' },
                  { id: 'outro', label: 'Outra preferência' }
                ].map(opt => (
                  <label key={opt.id} className={data.rotina_envio_modo === opt.id ? 'checked' : ''} style={{ cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="rotina_envio_modo" 
                      checked={data.rotina_envio_modo === opt.id} 
                      onChange={() => setData({ ...data, rotina_envio_modo: opt.id })}
                      style={{ display: 'none' }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {(data.rotina_envio_modo === 'email' || data.rotina_envio_modo === 'ambos') && (
            <div className="form-row full" style={{ marginTop: '10px' }}>
              <div className="field">
                <label>E-mails para envio (pode adicionar mais de 1)</label>
                <input 
                  id="f_rotina_envio_emails" 
                  type="text" 
                  value={data.rotina_envio_emails} 
                  onChange={handleChange} 
                  placeholder="Ex: financeiro@lab.com, gestao@lab.com" 
                />
              </div>
            </div>
          )}

          {(data.rotina_envio_modo === 'ambos') && (
            <div className="form-row full" style={{ marginTop: '10px' }}>
              <div className="field">
                <label>Números de WhatsApp para notificação (pode adicionar mais de 1)</label>
                <input 
                  id="f_rotina_envio_whatsapps" 
                  type="text" 
                  value={data.rotina_envio_whatsapps} 
                  onChange={handleChange} 
                  placeholder="Ex: (11) 99999-9999, (11) 88888-8888" 
                />
              </div>
            </div>
          )}

          {(data.rotina_envio_modo === 'outro') && (
            <div className="form-row full" style={{ marginTop: '10px' }}>
              <div className="field">
                <label>Descreva a outra preferência de recebimento</label>
                <textarea 
                  id="f_rotina_envio_outro" 
                  value={data.rotina_envio_outro} 
                  onChange={handleChange} 
                  placeholder="Descreva por onde o cliente quer receber as informações..." 
                  rows={4}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="icon">📎</span><h2>7. Documentos Adicionais</h2></div>
        <div className="card-body">
          <div className="form-row full">
            <div className="field">
              <label>Anexos (PDF ou Imagens para compor o documento final)</label>
              <div className="attachments-list" style={{ marginTop: '10px' }}>
                {data.documentos_adicionais.map((doc, idx) => (
                  <div key={doc.id} className="attachment-item" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '10px', 
                    background: '#f8fafc', 
                    borderRadius: '8px', 
                    marginBottom: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ marginRight: '12px', color: '#64748b' }}>
                      {doc.type === 'pdf' ? <FileText size={20} /> : <ImageIcon size={20} />}
                    </div>
                    <div style={{ flex: 1, fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{doc.name}</div>
                    <button 
                      className="btn-delete" 
                      onClick={() => {
                        const newList = [...data.documentos_adicionais];
                        newList.splice(idx, 1);
                        setData({ ...data, documentos_adicionais: newList });
                      }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
              
              <div style={{ marginTop: '15px' }}>
                <label className="btn-add" style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer',
                  padding: '10px 20px',
                  background: '#f1f5f9',
                  color: '#475569',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  border: '1px dashed #cbd5e1'
                }}>
                  <Plus size={18} />
                  Anexar Documento (PDF/JPG/PNG)
                  <input 
                    type="file" 
                    multiple 
                    accept="application/pdf,image/*" 
                    style={{ display: 'none' }} 
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files) return;
                      
                      Array.from(files).forEach(file => {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const result = ev.target?.result as string;
                          setData(prev => ({
                            ...prev,
                            documentos_adicionais: [
                              ...prev.documentos_adicionais,
                              {
                                id: Math.random().toString(36).substr(2, 9),
                                name: file.name,
                                type: file.type.includes('pdf') ? 'pdf' : 'image',
                                url: result
                              }
                            ]
                          }));
                        };
                        reader.readAsDataURL(file);
                      });
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
                Nota: O conteúdo destes arquivos será exibido em páginas inteiras após as assinaturas do documento principal.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <div className="card-header"><span className="icon">🤝</span><h2>Fechamento do Kick-Off</h2></div>
        <div className="card-body">
          <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', marginBottom: '20px' }}>
            Esta seção abaixo é um resumo do compromisso entre as partes e aparecerá automaticamente na folha de assinaturas do seu PDF final.
          </p>
          
          <div style={{ padding: '20px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <h3 style={{ color: '#1e293b', marginBottom: '10px', fontSize: '16px' }}>🤝 Compromisso de Implantação</h3>
            <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5', marginBottom: '15px' }}>
              Com a assinatura deste documento, as partes confirmam estar alinhadas com o cronograma, as diretrizes de comunicação 
              e a dinâmica de implantação apresentadas neste Kick-Off. Nosso objetivo comum é garantir uma transição suave, 
              autônoma e eficiente para a utilização plena do software LIGA no laboratório.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', marginBottom: '8px' }}>📋 Próximos Passos</h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: '#1e293b' }}>
                  <li style={{ marginBottom: '4px' }}>Criação do canal de comunicação (WhatsApp).</li>
                  <li style={{ marginBottom: '4px' }}>Configuração inicial da Base Padrão.</li>
                  <li style={{ marginBottom: '4px' }}>Início das reuniões agendadas.</li>
                </ul>
              </div>
              <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '20px' }}>
                <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', marginBottom: '8px' }}>💡 Lembrete</h4>
                <p style={{ margin: 0, fontSize: '11px', color: '#1e293b' }}>
                  Toda a comunicação e agendamentos serão centralizados no grupo oficial para rastreabilidade completa.
                </p>
              </div>
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

export default KickoffForm;
