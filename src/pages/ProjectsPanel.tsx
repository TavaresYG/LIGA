import React, { useState, useEffect } from 'react';
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
  X
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

  const activeProjects = projects.filter(p => p.status !== 'Concluído').length;
  const liveProjects = projects.filter(p => p.is_live).length;
  const avgProgress = projects.length ? (projects.reduce((acc, p) => acc + (p.progress || 0), 0) / projects.length).toFixed(0) : 0;

  if (loading) return <div style={{ padding: '2rem' }}>Carregando painel de projetos...</div>;

  return (
    <div className="projects-page fade-in">
      
      <div className="projects-header">
        <div>
          <div className="projects-title">
            <Briefcase size={28} color="var(--accent)" />
            Monitoramento de Projetos
          </div>
          <p className="projects-subtitle">Acompanhe em tempo real o andamento e a saúde das implantações e entregas ativas.</p>
        </div>
        <div className="projects-actions">
          <button className="btn-add-project" onClick={() => handleOpenModal()}>
            <Plus size={18} /> Novo Projeto
          </button>
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

      <div className="projects-grid">
        {projects.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Nenhum projeto registrado ainda.</p>
        ) : (
          projects.map(project => (
            <div key={project.id} className={`project-card priority-${project.priority.toLowerCase()}`}>
              
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
                          .filter(c => c.toLowerCase().includes(formData.client_name.toLowerCase()) && c !== formData.client_name)
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
                    <option value="Alta">Alta (Urgente)</option>
                    <option value="Média">Média (Normal)</option>
                    <option value="Baixa">Baixa</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status Atual</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="Na fila">Na fila</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Atrasado">Atrasado</option>
                    <option value="Pausado">Pausado</option>
                    <option value="Concluído">Concluído</option>
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
