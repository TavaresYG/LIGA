import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Briefcase, 
  Plus, 
  Activity, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  MessageCircle,
  DollarSign,
  Edit2,
  Trash2,
  LayoutGrid,
  List,
  Search,
  X,
  Loader2,
  RefreshCw,
  Upload,
  Download
} from 'lucide-react';
import '../styles/projects.css';

import BASE_API_URL from '../api/config';
const API_URL = `${BASE_API_URL}/api`;

interface Project {
  id: string;
  priority: string;
  name: string;
  client_name: string;
  progress: number;
  status: string;
  is_live: boolean;
  solution_hired: string;
  analyst: string;
  whatsapp_group: string;
  monthly_fee: string | number;
}

const ProjectsPanel: React.FC = () => {
  const { token, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterPriority, setFilterPriority] = useState('Todas');
  const [filterAnalyst, setFilterAnalyst] = useState('Todos');
  const [filterSolution, setFilterSolution] = useState('Todas');
  const [filterWhatsapp, setFilterWhatsapp] = useState('Todos');
  const [filterMonthly, setFilterMonthly] = useState('Todos');
  const [isSyncingAsana, setIsSyncingAsana] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncTotal, setSyncTotal] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const initialFormState = {
    priority: 'Média',
    name: '',
    client_name: '',
    progress: 0,
    status: 'Em andamento',
    is_live: false,
    solution_hired: '',
    analyst: '',
    whatsapp_group: '',
    monthly_fee: 0
  };

  const [formData, setFormData] = useState<any>(initialFormState);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setProjects(await res.json());
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_URL}/clients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setClients(await res.json());
    } catch (err) {
      console.error('Failed to fetch clients', err);
    }
  };

  const handleSyncAsana = async () => {
    const asanaToken = localStorage.getItem('asana_token');
    const workspaceId = localStorage.getItem('asana_workspace');

    if (!asanaToken) {
      alert('Token do Asana não configurado. Vá no menu de Administrador > Integrações.');
      return;
    }

    setIsSyncingAsana(true);
    setSyncProgress(0);
    setSyncTotal(0);
    try {
      // 1. Fetch Projects from Asana
      const projectsUrl = workspaceId 
        ? `https://app.asana.com/api/1.0/workspaces/${workspaceId}/projects?opt_fields=name,notes,owner.name,current_status.text,percentage_complete,num_tasks,num_completed_tasks,custom_fields`
        : `https://app.asana.com/api/1.0/projects?opt_fields=name,notes,owner.name,current_status.text,percentage_complete,num_tasks,num_completed_tasks,custom_fields`;

      const response = await fetch(projectsUrl, {
        headers: { 'Authorization': `Bearer ${asanaToken}` }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.errors ? errorData.errors[0].message : 'Status ' + response.status;
        throw new Error('Falha na API do Asana: ' + message);
      }

      const { data: asanaProjects } = await response.json();
      
      if (!asanaProjects || asanaProjects.length === 0) {
        alert('Nenhum projeto encontrado no seu Asana.');
        setIsSyncingAsana(false);
        return;
      }

      setSyncTotal(asanaProjects.length);
      const portfoliosUrl = workspaceId 
        ? `https://app.asana.com/api/1.0/portfolios?workspace=${workspaceId}&owner=me&opt_fields=name,gid`
        : `https://app.asana.com/api/1.0/portfolios?owner=me&opt_fields=name,gid`;

      const portfRes = await fetch(portfoliosUrl, { headers: { 'Authorization': `Bearer ${asanaToken}` } });
      const projectToClientName: Record<string, string> = {};

      if (portfRes.ok) {
        const { data: portfolios } = await portfRes.json();
        await Promise.all(portfolios.map(async (p: any) => {
          try {
            const itemsRes = await fetch(`https://app.asana.com/api/1.0/portfolios/${p.gid}/items?opt_fields=name`, {
               headers: { 'Authorization': `Bearer ${asanaToken}` }
            });
            if (itemsRes.ok) {
              const { data: items } = await itemsRes.json();
              items.forEach((item: any) => {
                projectToClientName[item.gid] = p.name;
              });
            }
          } catch (e) {}
        }));
      }

      alert(`Iniciando Sincronização Detalhada (292 projetos). 
Esta etapa levará aproximadamente 2-3 minutos devido aos limites de segurança da API do Asana para garantir que todos os progressos sejam calculados corretamente.

Por favor, mantenha a aba aberta.`);

      const getCustomFieldValue = (fields: any[], name: string) => {
        const field = fields?.find(f => f.name.toLowerCase() === name.toLowerCase());
        return field?.display_value || field?.text_value || field?.number_value || null;
      };

      // Helper function for delay
      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      let importedCount = 0;
      
      for (const ap of asanaProjects) {
        const customFields = ap.custom_fields || [];
        let calculatedProgress = 0;

        try {
          // Buscando progresso real via contagem de tarefas
          const taskCountRes = await fetch(`https://app.asana.com/api/1.0/projects/${ap.gid}/task_counts?opt_fields=num_tasks,num_completed_tasks`, {
            headers: { 'Authorization': `Bearer ${asanaToken}` }
          });
          
          if (taskCountRes.ok) {
            const { data: counts } = await taskCountRes.json();
            if (counts && counts.num_tasks > 0) {
              calculatedProgress = Math.round((counts.num_completed_tasks / counts.num_tasks) * 100);
            }
          }
        } catch (e) {
          console.error(`Erro ao buscar progresso do projeto ${ap.name}`, e);
        }

        const newProject = {
          priority: getCustomFieldValue(customFields, 'Prioridade Projeto') || '---',
          name: ap.name,
          client_name: projectToClientName[ap.gid] || '---', 
          progress: calculatedProgress,
          status: getCustomFieldValue(customFields, 'Status Projeto') || ap.current_status?.text || '---',
          is_live: (getCustomFieldValue(customFields, 'Status Projeto') || '').toLowerCase().includes('live') || 
                   (getCustomFieldValue(customFields, 'Status Projeto') || '').toLowerCase().includes('produção'),
          solution_hired: getCustomFieldValue(customFields, 'Solução Contratada') || '---',
          analyst: getCustomFieldValue(customFields, 'Analista Responsável') || ap.owner?.name || '---',
          whatsapp_group: getCustomFieldValue(customFields, 'Grupo Whatsapp') || '---',
          monthly_fee: Number(getCustomFieldValue(customFields, 'Mensalidade')) || 0
        };

        const res = await fetch(`${API_URL}/projects`, {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             Authorization: `Bearer ${token}`
           },
           body: JSON.stringify(newProject)
        });
        
        if (res.ok) {
          importedCount++;
          setSyncProgress(importedCount);
        }

        // PAUSA DE SEGURANÇA (Throttling)
        await sleep(450);
      }

      if (importedCount > 0) {
        alert(`${importedCount} projetos sincronizados com sucesso com progresso real calculado!`);
        fetchProjects();
        fetchClients();
      } else {
        alert('Nenhum projeto foi importado.');
      }

    } catch (error: any) {
      console.error(error);
      alert('Erro crítico na sincronização: ' + (error.message || error));
    } finally {
      setIsSyncingAsana(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('CUIDADO: Tem certeza que deseja excluir TODOS os projetos de uma vez? Esta ação não pode ser desfeita.')) return;
    try {
      const res = await fetch(`${API_URL}/projects-all`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setProjects([]);
        alert('Todos os projetos foram excluídos com sucesso!');
      } else {
        alert('Erro ao excluir projetos.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['nome', 'cliente', 'solucao_contratada', 'analista', 'status', 'progresso', 'mensalidade', 'cliente_virado', 'prioridade', 'whatsapp'];
    const exampleRow = ['Implantação LIGAERP', 'Supermercado Exemplo', 'LIGA ERP', 'João Silva', 'Em andamento', '45', '1500.00', 'nao', 'Media', 'https://chat.whatsapp.com/...'];
    const csvContent = [headers.join(';'), exampleRow.join(';')].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo_importacao_projetos.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length <= 1) {
          alert('O arquivo está vazio ou não possui dados válidos.');
          return;
        }

        const separator = lines[0].includes(';') ? ';' : ',';
        let importedCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(separator);
          if (cols.length >= 1 && cols[0].trim()) {
            const newProject = {
              name: cols[0]?.trim() || '',
              client_name: cols[1]?.trim() || '',
              solution_hired: cols[2]?.trim() || '',
              analyst: cols[3]?.trim() || '',
              status: cols[4]?.trim() || 'Em andamento',
              progress: Number(cols[5]?.trim()) || 0,
              monthly_fee: Number(cols[6]?.trim()) || 0,
              is_live: (cols[7]?.trim() || '').toLowerCase() === 'sim',
              priority: cols[8]?.trim() || 'Média',
              whatsapp_group: cols[9]?.trim() || ''
            };
            const res = await fetch(`${API_URL}/projects`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify(newProject)
            });
            if (res.ok) importedCount++;
          }
        }

        if (importedCount > 0) {
          alert(`${importedCount} projeto(s) importado(s) com sucesso!`);
          fetchProjects();
          fetchClients();
        } else {
          alert('Nenhum dado válido para importação.');
        }
      } catch (err) {
        alert('Erro ao processar arquivo CSV.');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (token) {
      fetchProjects();
      fetchClients();
    }
  }, [token]);

  useEffect(() => {
    const handleClickOutside = () => setIsAutocompleteOpen(false);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleOpenModal = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        ...project,
        is_live: !!project.is_live
      });
    } else {
      setEditingProject(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
    setFormData(initialFormState);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingProject ? 'PUT' : 'POST';
      const url = editingProject ? `${API_URL}/projects/${editingProject.id}` : `${API_URL}/projects`;
      
      const payload = {
        ...formData,
        progress: Number(formData.progress),
        monthly_fee: Number(formData.monthly_fee)
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        fetchProjects();
        fetchClients();
        handleCloseModal();
      } else {
        alert('Erro ao salvar projeto');
      }
    } catch (err) {
      console.error(err);
      alert('Erro inesperado');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este projeto?')) return;
    try {
      const res = await fetch(`${API_URL}/projects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(search.toLowerCase()) || 
                         (p.client_name || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'Todos' || p.status === filterStatus;
    const matchesPriority = filterPriority === 'Todas' || p.priority === filterPriority;
    const matchesAnalyst = filterAnalyst === 'Todos' || p.analyst === filterAnalyst;
    const matchesSolution = filterSolution === 'Todas' || p.solution_hired === filterSolution;
    const matchesWhatsapp = filterWhatsapp === 'Todos' || 
                           (filterWhatsapp === 'Com Grupo' && p.whatsapp_group && p.whatsapp_group !== '---') || 
                           (filterWhatsapp === 'Sem Grupo' && (!p.whatsapp_group || p.whatsapp_group === '---'));
    const matchesMonthly = filterMonthly === 'Todos' || 
                          (filterMonthly === 'Com Mensalidade' && Number(p.monthly_fee) > 0) || 
                          (filterMonthly === 'Sem Mensalidade' && (!p.monthly_fee || Number(p.monthly_fee) === 0));
    
    return matchesSearch && matchesStatus && matchesPriority && matchesAnalyst && matchesSolution && matchesWhatsapp && matchesMonthly;
  });

  const analysts = Array.from(new Set(projects.map(p => p.analyst).filter(Boolean))).sort();
  const solutions = Array.from(new Set(projects.map(p => p.solution_hired).filter(Boolean))).sort();
  const statuses = Array.from(new Set(projects.map(p => p.status).filter(Boolean))).sort();
  const priorities = Array.from(new Set(projects.map(p => p.priority).filter(Boolean))).sort();

  const activeProjects = filteredProjects.filter(p => p && p.status !== 'Concluído').length;
  const liveProjects = filteredProjects.filter(p => p && p.is_live).length;
  const avgProgress = filteredProjects.length ? (filteredProjects.reduce((acc, p) => acc + (p?.progress || 0), 0) / filteredProjects.length).toFixed(0) : 0;

  if (loading) return <div style={{ padding: '2rem' }}>Carregando painel de projetos...</div>;

  const syncPercentage = syncTotal > 0 ? Math.round((syncProgress / syncTotal) * 100) : 0;

  return (
    <div className="projects-page fade-in">
      
      {isSyncingAsana && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: 'var(--bg-card)', padding: '1rem', borderBottom: '2px solid var(--accent)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', animation: 'slideDown 0.3s ease' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                <Loader2 size={20} className="animate-spin" color="var(--accent)" />
                <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>Sincronizando com Asana...</span>
             </div>
             <div style={{ flex: 1, height: '10px', background: 'var(--bg-hover)', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--accent)', width: `${syncPercentage}%`, transition: 'width 0.3s ease' }}></div>
             </div>
             <div style={{ flexShrink: 0, fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                {syncProgress} de {syncTotal} projetos ({syncPercentage}%)
             </div>
          </div>
        </div>
      )}
      
      <div className="projects-header" style={{ alignItems: 'center' }}>
        <div>
          <div className="projects-title">
            <Briefcase size={28} color="var(--accent)" />
            Monitoramento de Projetos
          </div>
          <p className="projects-subtitle">Acompanhe em tempo real o andamento e a saúde das implantações e entregas ativas.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <div className="search-bar" style={{ width: '240px', flex: '0 0 240px', margin: 0, height: '42px' }}>
              <Search size={18} className="search-icon" />
              <input 
                type="text" 
                placeholder="Buscar projeto..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ height: '100%' }}
              />
            </div>

            <button 
              className="btn-add-project" 
              style={{ background: 'var(--bg-card)', color: 'var(--text-heading)', border: '1px solid var(--border-color)', fontWeight: '500' }} 
              onClick={handleSyncAsana}
              disabled={isSyncingAsana}
            >
              {isSyncingAsana ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} 
              Asana
            </button>

            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
            <button 
              className="btn-add-project" 
              style={{ background: 'var(--bg-card)', color: 'var(--text-heading)', border: '1px solid var(--border-color)', fontWeight: '500' }} 
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} /> Importar Planilha
            </button>

            <button 
              className="btn-add-project" 
              style={{ background: 'var(--bg-card)', color: 'var(--text-heading)', border: '1px solid var(--border-color)', fontWeight: '500' }} 
              onClick={handleDownloadTemplate}
            >
              <Download size={16} /> Modelo XLS
            </button>


            <button className="btn-add-project" onClick={() => handleOpenModal()}>
              <Plus size={18} /> Novo Projeto
            </button>

            <button className="btn-add-project btn-danger" onClick={handleDeleteAll}>
              <Trash2 size={18} /> Limpar Todos
            </button>
          </div>
        </div>
      </div>

      <div className="projects-metrics">
        <div className="metric-card">
          <div className="metric-icon"><Activity /></div>
          <div className="metric-info">
            <h3>Projetos Ativos</h3>
            <p>{activeProjects}</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon"><CheckCircle2 /></div>
          <div className="metric-info">
            <h3>Clientes Virados (Live)</h3>
            <p>{liveProjects}</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon"><Users /></div>
          <div className="metric-info">
            <h3>Progresso Médio</h3>
            <p>{avgProgress}%</p>
          </div>
        </div>
      </div>

      <div className="filter-row" style={{ flexWrap: 'nowrap', gap: '0.5rem', justifyContent: 'space-between', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <div className="filters-group" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'nowrap', alignItems: 'center' }}>
          <select 
            className="filter-select" 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', borderRadius: '0.6rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.78rem', minWidth: '120px' }}
          >
            <option value="Todos">Status (Todos)</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select 
            className="filter-select" 
            value={filterPriority} 
            onChange={(e) => setFilterPriority(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', borderRadius: '0.6rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.78rem', minWidth: '120px' }}
          >
            <option value="Todas">Prioridade (Todas)</option>
            {priorities.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select 
            className="filter-select" 
            value={filterAnalyst} 
            onChange={(e) => setFilterAnalyst(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', borderRadius: '0.6rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.78rem', minWidth: '120px' }}
          >
            <option value="Todos">Analista (Todos)</option>
            {analysts.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          <select 
            className="filter-select" 
            value={filterSolution} 
            onChange={(e) => setFilterSolution(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', borderRadius: '0.6rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.78rem', minWidth: '120px' }}
          >
            <option value="Todas">Solução (Todas)</option>
            {solutions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select 
            className="filter-select" 
            value={filterWhatsapp} 
            onChange={(e) => setFilterWhatsapp(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', borderRadius: '0.6rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.78rem', minWidth: '120px' }}
          >
            <option value="Todos">WhatsApp (Tudo)</option>
            <option value="Com Grupo">Com Grupo</option>
            <option value="Sem Grupo">Sem Grupo</option>
          </select>

          <select 
            className="filter-select" 
            value={filterMonthly} 
            onChange={(e) => setFilterMonthly(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', borderRadius: '0.6rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.78rem', minWidth: '120px' }}
          >
            <option value="Todos">Mensalidade (Tudo)</option>
            <option value="Com Mensalidade">Com Mensalidade</option>
            <option value="Sem Mensalidade">Sem Mensalidade</option>
          </select>
        </div>

        <div className="view-toggle" style={{ flexShrink: 0 }}>
          <button 
            className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`} 
            onClick={() => setViewMode('grid')}
            title="Visualização em Grade"
            style={{ padding: '0.4rem' }}
          >
            <LayoutGrid size={18} />
          </button>
          <button 
            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`} 
            onClick={() => setViewMode('list')}
            title="Visualização em Lista"
            style={{ padding: '0.4rem' }}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="projects-grid">
          {filteredProjects.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Nenhum projeto encontrado.</p>
          ) : (
            filteredProjects.map(project => (
              <div key={project.id} className={`project-card priority-${(project.priority || 'Média').toLowerCase()}`}>
                
                <div className="project-header">
                  <div>
                    <div className="project-brand" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={12} /> {project.client_name || 'Individual'}
                      <span style={{ opacity: 0.3 }}>|</span>
                      {project.solution_hired}
                    </div>
                    <h3 className="project-name">{project.name}</h3>
                  </div>
                  <div className="project-actions">
                    <button className="btn-edit" onClick={() => handleOpenModal(project)}><Edit2 size={16} /></button>
                    <button className="btn-del" onClick={() => handleDelete(project.id)}><Trash2 size={16} /></button>
                  </div>
                </div>

                <div className="project-progress-container">
                  <div className="progress-header">
                    <span>Progresso da Implantação</span>
                    <span className="progress-value">{project.progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${project.progress}%` }}></div>
                  </div>
                </div>

                <div className="project-details">
                   <div className="detail-item">
                     <span className="detail-label">Status</span>
                     <span className="detail-value">
                       {project.status === 'Atrasado' ? <AlertCircle size={14} color="#ef4444" /> : <Clock size={14} color="var(--accent)" />}
                       {project.status}
                     </span>
                   </div>
                   
                   <div className="detail-item">
                     <span className="detail-label">Analista Responsável</span>
                     <span className="detail-value">{project.analyst || '—'}</span>
                   </div>
                   
                   <div className="detail-item">
                     <span className="detail-label">Cliente Virado</span>
                     <span className="detail-value">
                       <span className={`status-badge live-${project.is_live ? 'yes' : 'no'}`}>
                         {project.is_live ? 'Sim (Em Produção)' : 'Não'}
                       </span>
                     </span>
                   </div>

                   <div className="detail-item">
                     <span className="detail-label">Mensalidade</span>
                     <span className="detail-value">
                       <DollarSign size={14} /> 
                       {Number(project.monthly_fee).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                     </span>
                   </div>

                   <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                      <span className="detail-label">Grupo de Acompanhamento</span>
                      <span className="detail-value">
                        <MessageCircle size={14} color="#128c7e"/>
                        {project.whatsapp_group ? (
                          project.whatsapp_group.startsWith('http') ? (
                            <a href={project.whatsapp_group} target="_blank" rel="noopener noreferrer" className="whatsapp-link">
                              Acessar WhatsApp
                            </a>
                          ) : (
                            project.whatsapp_group
                          )
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Sem grupo</span>
                        )}
                      </span>
                   </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="portfolios-list-container">
          <table className="portfolios-table">
            <thead>
              <tr>
                <th>Nome do Projeto</th>
                <th>Cliente</th>
                <th>Status</th>
                <th>Progresso</th>
                <th>Analista</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    Nenhum projeto encontrado.
                  </td>
                </tr>
              ) : (
                filteredProjects.map(project => (
                  <tr key={project.id}>
                    <td>
                       <div style={{ display: 'flex', flexDirection: 'column' }}>
                         <span style={{ fontWeight: '700', color: 'var(--text-heading)' }}>{project.name}</span>
                         <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{project.solution_hired}</span>
                       </div>
                    </td>
                    <td>{project.client_name || 'Individual'}</td>
                    <td>
                      <span className={`status-badge live-${project.is_live ? 'yes' : 'no'}`} style={{ fontSize: '0.7rem' }}>
                        {project.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="progress-bar" style={{ width: '60px' }}>
                           <div className="progress-fill" style={{ width: `${project.progress}%` }}></div>
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--accent)' }}>{project.progress}%</span>
                      </div>
                    </td>
                    <td>{project.analyst || '—'}</td>
                    <td>
                       <div className="list-actions">
                         <button className="btn-edit" onClick={() => handleOpenModal(project)}><Edit2 size={18} /></button>
                         <button className="btn-del" onClick={() => handleDelete(project.id)}><Trash2 size={18} /></button>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProject ? 'Editar Projeto' : 'Registrar Novo Projeto'}</h2>
              <button className="btn-close" onClick={handleCloseModal}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body form-grid">
                
                <div className="form-group">
                  <label>Cliente (Vínculo) *</label>
                  <div className="autocomplete-wrapper" onClick={e => e.stopPropagation()}>
                    <input 
                      required 
                      type="text" 
                      value={formData.client_name}
                      autoComplete="off"
                      onChange={e => {
                        setFormData({...formData, client_name: e.target.value});
                        setIsAutocompleteOpen(true);
                      }}
                      onFocus={() => setIsAutocompleteOpen(true)}
                      onClick={() => setIsAutocompleteOpen(true)}
                      placeholder="Selecione ou digite um novo..."
                    />
                    {isAutocompleteOpen && formData.client_name.trim() !== '' && (
                      <div className="autocomplete-dropdown">
                        {clients
                          .filter(c => (c || '').toLowerCase().includes((formData.client_name || '').toLowerCase()) && c !== formData.client_name)
                          .map((client, idx) => (
                            <div 
                              key={idx} 
                              className="autocomplete-option"
                              onClick={() => {
                                setFormData({...formData, client_name: client});
                                setIsAutocompleteOpen(false);
                              }}
                            >
                              <Users size={14} />
                              {client}
                            </div>
                          ))}
                        {clients.filter(c => c.toLowerCase().includes(formData.client_name.toLowerCase()) && c !== formData.client_name).length === 0 && (
                          <div className="autocomplete-empty">Novo Cliente: "{formData.client_name}"</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Nome do Projeto *</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    placeholder="Ex: Refatoração de Estoque..."
                  />
                </div>

                <div className="form-group">
                  <label>Solução Contratada *</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.solution_hired} 
                    onChange={e => setFormData({...formData, solution_hired: e.target.value})} 
                    placeholder="Ex: LIGA ERP, GESTOR..."
                  />
                </div>

                <div className="form-group">
                  <label>Analista Responsável</label>
                  <input 
                    type="text" 
                    value={formData.analyst} 
                    onChange={e => setFormData({...formData, analyst: e.target.value})} 
                    placeholder="Nome do analista..."
                  />
                </div>

                <div className="form-group">
                  <label>Prioridade</label>
                  <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                    <option value="---">--- (Não definida)</option>
                    {priorities.filter(p => p !== '---').map(p => <option key={p} value={p}>{p}</option>)}
                    {!priorities.includes(formData.priority) && formData.priority !== '---' && (
                       <option value={formData.priority}>{formData.priority}</option>
                    )}
                    {/* Fallback caso esteja vazio */}
                    {priorities.length === 0 && (
                      <>
                        <option value="Alta">Alta</option>
                        <option value="Média">Média</option>
                        <option value="Baixa">Baixa</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>Status Atual</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="---">--- (Não definido)</option>
                    {statuses.filter(s => s !== '---').map(s => <option key={s} value={s}>{s}</option>)}
                    {!statuses.includes(formData.status) && formData.status !== '---' && (
                      <option value={formData.status}>{formData.status}</option>
                    )}
                    {/* Opções padrão caso a lista esteja vazia */}
                    {statuses.length === 0 && (
                      <>
                        <option value="Não iniciado">Não iniciado</option>
                        <option value="Em andamento">Em andamento</option>
                        <option value="Concluído">Concluído</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>Progresso (%)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={formData.progress} 
                    onChange={e => setFormData({...formData, progress: e.target.value})} 
                  />
                </div>

                <div className="form-group">
                  <label>Mensalidade Acordada (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={formData.monthly_fee} 
                    onChange={e => setFormData({...formData, monthly_fee: e.target.value})} 
                  />
                </div>

                <div className="form-group full">
                  <label>Link / Nome do Grupo do WhatsApp</label>
                  <input 
                    type="text" 
                    value={formData.whatsapp_group} 
                    onChange={e => setFormData({...formData, whatsapp_group: e.target.value})} 
                    placeholder="Cole a URL de convite do grupo..."
                  />
                </div>

                <div className="form-group full" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', background: 'var(--bg-hover)', padding: '1rem', borderRadius: '0.75rem' }}>
                  <input 
                    type="checkbox" 
                    id="is_live" 
                    checked={formData.is_live} 
                    onChange={e => setFormData({...formData, is_live: e.target.checked})} 
                    style={{ width: '20px', height: '20px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  <label htmlFor="is_live" style={{ cursor: 'pointer', margin: 0, fontSize: '0.95rem', color: 'var(--text-heading)' }}>
                    O cliente é considerado VIRADO? (Já opera em produção)
                  </label>
                </div>

              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={handleCloseModal}>Cancelar</button>
                <button type="submit" className="btn-save">Salvar Projeto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPanel;
