import React, { useState, useEffect } from 'react';
import { SavedDoc } from '../types';
import { FileText, Plus, Search, Trash2, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:5000/api';

interface DashboardProps {
  onNewDoc: () => void;
  onViewDoc: (doc: SavedDoc) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNewDoc, onViewDoc }) => {
  const { token } = useAuth();
  const [docs, setDocs] = useState<SavedDoc[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchDocs = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Map snake_case from DB to camelCase for frontend
        const mappedDocs: SavedDoc[] = data.map((d: any) => ({
          id: d.id,
          type: d.type,
          clientName: d.client_name,
          date: d.date,
          implantador: d.implantador,
          data: d.data,
          createdAt: d.created_at
        }));
        setDocs(mappedDocs);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [token]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    
    if (confirm('Deseja realmente excluir este documento?')) {
      try {
        const response = await fetch(`${API_URL}/documents/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          setDocs(docs.filter(d => d.id !== id));
        } else {
          alert('Erro ao excluir documento');
        }
      } catch (err) {
        console.error('Delete error:', err);
        alert('Falha ao conectar com o servidor');
      }
    }
  };

  const filteredDocs = docs.filter(d => 
    (d.clientName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (d.implantador?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dashboard-container">
      <div className="dash-header">
        <div className="dash-title">
          <h1>DocCenter LIGA</h1>
          <p>Gerenciamento de Documentações de Implantação</p>
        </div>
        <button onClick={onNewDoc} className="btn-primary">
          <Plus size={20} /> Novo Documento
        </button>
      </div>

      <div className="card-container">
        <div className="search-bar">
          <Search size={18} className="text-muted" />
          <input 
            type="text" 
            placeholder="Pesquisar por laboratório ou implantador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="table-wrapper">
          <table className="liga-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Cliente</th>
                <th>Data Kick-Off</th>
                <th>Implantador</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem' }}>Carregando documentos...</td>
                </tr>
              ) : filteredDocs.length > 0 ? filteredDocs.map((doc) => (
                <tr key={doc.id} onClick={() => onViewDoc(doc)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className="doc-type">
                      <div className="icon-box"><FileText size={18} /></div>
                      <span style={{ fontWeight: 600 }}>Pré Kick-Off</span>
                    </div>
                  </td>
                  <td>{doc.clientName}</td>
                  <td>{doc.date}</td>
                  <td>{doc.implantador}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button className="action-btn btn-view" title="Visualizar/Imprimir">
                        <Printer size={18} />
                      </button>
                      <button 
                        className="action-btn btn-delete" 
                        title="Excluir"
                        onClick={(e) => handleDelete(doc.id, e)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Nenhum documento encontrado. Clique em "Novo Documento" para começar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
