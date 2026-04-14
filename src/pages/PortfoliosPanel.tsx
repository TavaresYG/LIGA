import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  Plus, 
  Users, 
  Edit2,
  Trash2,
  X,
  FileText,
  Activity,
  Eye,
  RefreshCw,
  Upload,
  Download,
  LayoutGrid,
  List,
  Search,
  Loader2
} from 'lucide-react';
import '../styles/projects.css';

import BASE_API_URL from '../api/config';
const API_URL = `${BASE_API_URL}/api`;

interface Portfolio {
  id: string;
  name: string;
  owner: string;
  description: string;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  client_name: string;
  progress: number;
  status: string;
  priority: string;
}

const PortfoliosPanel: React.FC = () => {
  const { token } = useAuth();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [filterAnalyst, setFilterAnalyst] = useState('Todos');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [viewingPortfolio, setViewingPortfolio] = useState<Portfolio | null>(null);

  const [isSyncingAsana, setIsSyncingAsana] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialFormState = {
    name: '',
    owner: '',
    description: ''
  };

  const [formData, setFormData] = useState<any>(initialFormState);

  const fetchData = async () => {
    try {
      const [resPort, resProj] = await Promise.all([
        fetch(`${API_URL}/portfolios`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/projects`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (resPort.ok) setPortfolios(await resPort.json());
      if (resProj.ok) setProjects(await resProj.json());
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const handleOpenModal = (portfolio?: Portfolio) => {
    if (portfolio) {
      setEditingPortfolio(portfolio);
      setFormData(portfolio);
    } else {
      setEditingPortfolio(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPortfolio(null);
    setFormData(initialFormState);
  };

  const handleViewDetails = (portfolio: Portfolio) => {
    setViewingPortfolio(portfolio);
    setIsDetailsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingPortfolio ? 'PUT' : 'POST';
      const url = editingPortfolio ? `${API_URL}/portfolios/${editingPortfolio.id}` : `${API_URL}/portfolios`;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        fetchData();
        handleCloseModal();
      } else {
        alert('Erro ao salvar portfólio');
      }
    } catch (err) {
      console.error(err);
      alert('Erro inesperado');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const linkedProjects = projects.filter(p => p.client_name === name);
    if (linkedProjects.length > 0) {
      alert(`Ação bloqueada: Este cliente possui ${linkedProjects.length} projeto(s) vinculado(s). Você deve excluir os projetos primeiro.`);
      return;
    }

    if (!window.confirm('Tem certeza que deseja excluir este portfólio?')) return;
    try {
      const res = await fetch(`${API_URL}/portfolios/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setPortfolios(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAll = async () => {
    const hasProjects = portfolios.some(c => projects.filter(p => p.client_name === c.name).length > 0);
    if (hasProjects) {
      alert('Ação bloqueada: Exclua (ou desvincule) todos os projetos antes de excluir todos os clientes.');
      return;
    }

    if (!window.confirm('CUIDADO: Tem certeza que deseja excluir TODOS os clientes (portfólios) de uma vez?')) return;
    try {
      const res = await fetch(`${API_URL}/portfolios-all`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setPortfolios([]);
        alert('Todos os clientes foram excluídos com sucesso!');
      } else {
         alert('Erro ao excluir clientes.');
      }
    } catch (err) {
      console.error(err);
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
    try {
      const portfoliosUrl = workspaceId 
        ? `https://app.asana.com/api/1.0/portfolios?workspace=${workspaceId}&owner=me&opt_fields=name,notes,created_at,owner.name`
        : `https://app.asana.com/api/1.0/portfolios?owner=me&opt_fields=name,notes,created_at,owner.name`;

      const response = await fetch(portfoliosUrl, {
        headers: { 'Authorization': `Bearer ${asanaToken}` }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.errors ? errorData.errors[0].message : 'Status ' + response.status;
        throw new Error('Falha na API do Asana: ' + message);
      }

      const { data: asanaPortfolios } = await response.json();
      
      if (!asanaPortfolios || asanaPortfolios.length === 0) {
        alert('O Asana respondeu com sucesso, mas retornou 0 portfólios cadastrados para o seu usuário neste Workspace.');
        setIsSyncingAsana(false);
        return;
      }

      alert(`Sucesso! Encontrei ${asanaPortfolios.length} portfólios no Asana. Iniciando importação...`);

      let importedCount = 0;
      let errorCount = 0;

      for (const ap of asanaPortfolios) {
         const newPortfolio = {
            name: ap.name,
            owner: ap.owner?.name || '---',
            description: ap.notes || '---'
         };

         const res = await fetch(`${API_URL}/portfolios`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(newPortfolio)
         });
         
         if (res.ok) {
           importedCount++;
         } else {
           const errorBody = await res.json().catch(() => ({}));
           console.error('Falha ao salvar portfólio localmente:', errorBody);
           errorCount++;
         }
      }

      if (importedCount > 0) {
        alert(`${importedCount} portfólios sincronizados com sucesso!${errorCount > 0 ? ` (${errorCount} falhas de gravação local)` : ''}`);
        fetchData();
      } else {
        alert(`Falha total na sincronização de portfólios.
Verifique se você tem permissão de administrador ou se o servidor está online. 
(Erro detectado: ${errorCount} tentativas falharam no servidor)`);
      }
    } catch (error: any) {
      console.error(error);
      alert('Erro crítico na sincronização: ' + (error.message || error));
    } finally {
      setIsSyncingAsana(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['nome', 'proprietario', 'descricao'];
    const exampleRow = ['Empresa Exemplo LTDA', 'João da Silva', 'Cliente do setor de tecnologia'];
    const csvContent = [headers.join(';'), exampleRow.join(';')].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo_importacao_clientes.csv';
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
        // Fix for multiple OS line endings \r\n vs \n
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length <= 1) {
          alert('O arquivo está vazio ou não possui dados válidos.');
          return;
        }

        let importedCount = 0;
        // Detect Separator based on header row
        const separator = lines[0].includes(';') ? ';' : ',';

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(separator);
          if (cols.length >= 1 && cols[0].trim()) {
            const newPortfolio = {
               name: cols[0]?.trim() || '',
               owner: cols[1]?.trim() || '',
               description: cols[2]?.trim() || ''
            };
            const res = await fetch(`${API_URL}/portfolios`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify(newPortfolio)
            });
            if (res.ok) importedCount++;
          }
        }

        if (importedCount > 0) {
          alert(`${importedCount} cliente(s) importado(s) com sucesso!`);
          fetchData();
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

  const filteredPortfolios = portfolios.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(search.toLowerCase()) || 
                         (p.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesAnalyst = filterAnalyst === 'Todos' || p.owner === filterAnalyst;
    
    return matchesSearch && matchesAnalyst;
  });

  const analysts = Array.from(new Set(portfolios.map(p => p.owner).filter(Boolean))).sort();

  const totalClients = filteredPortfolios.length;
  const totalProjectsLink = projects.filter(p => portfolios.some(c => c.name === p.client_name)).length;

  if (loading) return <div style={{ padding: '2rem' }}>Carregando painel de portfólios...</div>;

  return (
    <div className="projects-page fade-in">
      
      <div className="projects-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ flexShrink: 0 }}>
          <div className="projects-title">
            <Building2 size={28} color="var(--accent)" />
            Painel de Portfólios
          </div>
          <p className="projects-subtitle">Gerencie e cadastre todos os seus clientes e centralize o vínculo com as implantações.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'flex-end', flex: 1 }}>
          
          <div style={{ display: 'flex', alignItems: 'center', transition: 'all 0.3s ease' }}>
            {isSearchVisible && (
              <input 
                type="text" 
                autoFocus
                placeholder="Pesquisar..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '160px', padding: '0.4rem 0.6rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.8rem', marginRight: '0.4rem', outline: 'none', boxShadow: '0 0 10px rgba(255,193,7,0.1)' }}
              />
            )}
            <button 
              onClick={() => setIsSearchVisible(!isSearchVisible)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', display: 'flex', alignItems: 'center' }}
              title="Pesquisar"
            >
              <Search size={22} color="#FFC107" strokeWidth={3} />
            </button>
          </div>

          <button 
            className="btn-add-project" 
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', background: 'var(--bg-card)', color: 'var(--text-heading)', border: '1px solid var(--border-color)', fontWeight: '600' }} 
            onClick={handleSyncAsana}
            disabled={isSyncingAsana}
          >
            {isSyncingAsana ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} 
             Asana
          </button>
          
          <button 
            className="btn-add-project" 
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', background: 'var(--bg-card)', color: 'var(--text-heading)', border: '1px solid var(--border-color)', fontWeight: '600' }} 
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={14} /> Importar
          </button>

          <button 
            className="btn-add-project" 
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', background: 'var(--bg-card)', color: 'var(--text-heading)', border: '1px solid var(--border-color)', fontWeight: '600' }} 
            onClick={handleDownloadTemplate}
          >
            <Download size={14} /> Modelo XLS
          </button>

          <button 
            className="btn-add-project" 
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', fontWeight: '600' }} 
            onClick={() => handleOpenModal()}
          >
            <Plus size={14} /> Novo Portfólio
          </button>

          <button 
            className="btn-add-project btn-danger" 
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', fontWeight: '600' }}
            onClick={handleDeleteAll}
          >
            <Trash2 size={14} /> Limpar Todos
          </button>
        </div>
      </div>

      <div className="projects-metrics">
        <div className="metric-card">
          <div className="metric-icon"><Users /></div>
          <div className="metric-info">
            <h3>Total de Clientes/Portfólios</h3>
            <p>{totalClients}</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon"><Activity /></div>
          <div className="metric-info">
            <h3>Projetos Atrelados</h3>
            <p>{totalProjectsLink}</p>
          </div>
        </div>
      </div>

      <div className="filter-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'flex-start', alignItems: 'center' }}>
        <div className="filters-group" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select 
            className="filter-select" 
            value={filterAnalyst} 
            onChange={(e) => setFilterAnalyst(e.target.value)}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.85rem' }}
          >
            <option value="Todos">Analista (Todos)</option>
            {analysts.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div className="view-toggle">
          <button 
            className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`} 
            onClick={() => setViewMode('grid')}
            title="Visualização em Grade"
          >
            <LayoutGrid size={20} />
          </button>
          <button 
            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`} 
            onClick={() => setViewMode('list')}
            title="Visualização em Lista"
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="projects-grid">
          {filteredPortfolios.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Nenhum portfólio encontrado.</p>
          ) : (
            filteredPortfolios.map(portfolio => {
              const linkedProjects = projects.filter(p => p.client_name === portfolio.name);
              const projectCount = linkedProjects.length;
              
              return (
                <div key={portfolio.id} className="project-card" style={{ borderTop: '4px solid var(--accent)' }}>
                  <div className="project-header">
                    <div>
                      <div className="project-brand" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={12} /> {new Date(portfolio.created_at).toLocaleDateString()}
                      </div>
                      <h3 className="project-name">{portfolio.name}</h3>
                    </div>
                    <div className="project-actions">
                      <button className="btn-edit" onClick={() => handleViewDetails(portfolio)} title="Ver Detalhes e Projetos"><Eye size={16} /></button>
                      <button className="btn-edit" onClick={() => handleOpenModal(portfolio)} title="Editar"><Edit2 size={16} /></button>
                      <button className="btn-del" onClick={() => handleDelete(portfolio.id, portfolio.name)} title="Excluir"><Trash2 size={16} /></button>
                    </div>
                  </div>

                  <div className="project-details" style={{ gridTemplateColumns: '1fr', marginTop: '1rem' }}>
                    <div className="detail-item">
                      <span className="detail-label">Nome do cliente</span>
                      <span className="detail-value">{portfolio.name}</span>
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Projetos vinculados</span>
                      <span className="detail-value text-accent font-semibold flex items-center gap-1">
                         <Activity size={14} /> {projectCount}
                      </span>
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Descrição</span>
                      <span className="detail-value" style={{ whiteSpace: 'pre-wrap', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {portfolio.description || 'Sem descrição cadastrada.'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="portfolios-list-container">
          <table className="portfolios-table">
            <thead>
              <tr>
                <th>Nome do Cliente</th>
                <th>Responsável</th>
                <th>Projetos</th>
                <th>Criado em</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredPortfolios.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    Nenhum portfólio encontrado.
                  </td>
                </tr>
              ) : (
                filteredPortfolios.map(portfolio => {
                  const linkedProjects = projects.filter(p => p.client_name === portfolio.name);
                  return (
                    <tr key={portfolio.id}>
                      <td style={{ fontWeight: '700', color: 'var(--text-heading)' }}>{portfolio.name}</td>
                      <td>{portfolio.owner || '—'}</td>
                      <td>
                        <div className="list-project-count">
                          <Activity size={14} /> {linkedProjects.length} Projetos
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {new Date(portfolio.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="list-actions">
                          <button className="btn-edit" onClick={() => handleViewDetails(portfolio)} title="Ver Detalhes"><Eye size={18} /></button>
                          <button className="btn-edit" onClick={() => handleOpenModal(portfolio)} title="Editar"><Edit2 size={18} /></button>
                          <button className="btn-del" onClick={() => handleDelete(portfolio.id, portfolio.name)} title="Excluir"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL CADASTRAR / EDITAR */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPortfolio ? 'Editar Portfólio' : 'Registrar Novo Portfólio'}</h2>
              <button className="btn-close" onClick={handleCloseModal}><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body form-grid">
                <div className="form-group full">
                  <label>Nome do Cliente *</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    placeholder="Ex: Supermercado XYZ..."
                  />
                </div>

                <div className="form-group full">
                  <label>Proprietário / Responsável</label>
                  <input 
                    type="text" 
                    value={formData.owner} 
                    onChange={e => setFormData({...formData, owner: e.target.value})} 
                    placeholder="Ex: João da Silva"
                  />
                </div>

                <div className="form-group full">
                  <label>Descrição</label>
                  <textarea 
                    rows={4}
                    value={formData.description || ''} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    placeholder="Detalhes ou observações sobre o cliente..."
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', background: 'var(--bg-page)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={handleCloseModal}>Cancelar</button>
                <button type="submit" className="btn-save">Salvar Portfólio</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALHES (EYE) */}
      {isDetailsOpen && viewingPortfolio && (
        <div className="modal-overlay" onClick={() => setIsDetailsOpen(false)}>
           <div className="modal-content" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                 <h2>{viewingPortfolio.name}</h2>
                 <button className="btn-close" onClick={() => setIsDetailsOpen(false)}><X size={24} /></button>
              </div>
              <div className="modal-body">
                 <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                    <p style={{ margin: '0 0 0.5rem 0' }}><strong>Responsável:</strong> {viewingPortfolio.owner || 'Não definido'}</p>
                    <p style={{ margin: '0 0 0.5rem 0' }}><strong>Criado em:</strong> {new Date(viewingPortfolio.created_at).toLocaleDateString()}</p>
                    <p style={{ margin: 0 }}><strong>Descrição:</strong> <span style={{ color: 'var(--text-muted)' }}>{viewingPortfolio.description || 'Sem descrição.'}</span></p>
                 </div>
                 
                 <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-heading)' }}>Projetos Atrelados ao Portfólio</h3>
                 {projects.filter(p => p.client_name === viewingPortfolio.name).length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>Nenhum projeto encontrado.</p>
                 ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                       {projects.filter(p => p.client_name === viewingPortfolio.name).map(p => (
                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-page)', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                             <span style={{ fontWeight: '500' }}>{p.name}</span>
                             <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                               <span>{p.progress}% <span style={{ color: 'var(--text-muted)' }}>Progresso</span></span>
                               <span style={{ color: p.status === 'Concluído' ? 'var(--accent)' : 'inherit' }}>{p.status}</span>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default PortfoliosPanel;
