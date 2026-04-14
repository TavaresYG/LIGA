import React, { useState, useEffect } from 'react';
import { CheckSquare, ListTodo, Plus, Trash2, Award, ClipboardCheck, AlertCircle } from 'lucide-react';
import '../styles/goals.css';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  category: 'Geral' | 'Diário' | 'Semanal' | 'Projeto';
}

const ChecklistPage: React.FC = () => {
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    const saved = localStorage.getItem('liga_checklist');
    return saved ? JSON.parse(saved) : [
      { id: '1', text: 'Revisar metas do dia', completed: false, category: 'Diário' },
      { id: '2', text: 'Validar entregáveis no Asana', completed: false, category: 'Projeto' },
      { id: '3', text: 'Atualizar ranking semanal', completed: false, category: 'Semanal' },
    ];
  });

  const [newItem, setNewItem] = useState('');
  const [activeCategory, setActiveCategory] = useState<'Todas' | 'Diário' | 'Semanal' | 'Projeto' | 'Geral'>('Todas');

  useEffect(() => {
    localStorage.setItem('liga_checklist', JSON.stringify(items));
  }, [items]);

  const toggleItem = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    
    const item: ChecklistItem = {
      id: Math.random().toString(36).substr(2, 9),
      text: newItem,
      completed: false,
      category: activeCategory === 'Todas' ? 'Geral' : activeCategory as any,
    };
    
    setItems([item, ...items]);
    setNewItem('');
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const clearCompleted = () => {
    if (window.confirm('Deseja remover todas as tarefas concluídas?')) {
      setItems(items.filter(item => !item.completed));
    }
  };

  const filteredItems = items.filter(item => 
    activeCategory === 'Todas' ? true : item.category === activeCategory
  );

  const completedCount = items.filter(i => i.completed).length;
  const progress = items.length ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="goals-page fade-in" style={{ padding: '2rem' }}>
      <header className="goals-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="goals-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ClipboardCheck size={32} color="var(--accent)" />
            Checklist de Metas
          </h1>
          <p className="goals-subtitle">Mantenha o foco e organize suas tarefas para bater todas as metas.</p>
        </div>
        
        <div className="progress-summary-card" style={{ background: 'var(--bg-card)', padding: '1rem 1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div className="progress-circle-mini" style={{ width: '60px', height: '60px', borderRadius: '50%', background: `conic-gradient(var(--accent) ${progress}%, var(--bg-hover) 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
             <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: '800' }}>
               {progress}%
             </div>
          </div>
          <div>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Progresso Geral</h3>
            <p style={{ fontSize: '1.1rem', fontWeight: '700' }}>{completedCount} de {items.length} concluídos</p>
          </div>
        </div>
      </header>

      <div className="checklist-container" style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem' }}>
        {/* Sidebar de Categorias */}
        <aside className="checklist-sidebar">
          <div style={{ position: 'sticky', top: '2rem' }}>
            <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>Categorias</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(['Todas', 'Diário', 'Semanal', 'Projeto', 'Geral'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    textAlign: 'left',
                    background: activeCategory === cat ? 'var(--accent)' : 'transparent',
                    color: activeCategory === cat ? 'white' : 'var(--text-main)',
                    fontWeight: activeCategory === cat ? '700' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  {cat}
                  <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                    {items.filter(i => cat === 'Todas' ? true : i.category === cat).length}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,193,7,0.1)', borderRadius: '0.75rem', border: '1px border rgba(255,193,7,0.2)' }}>
               <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#B45309', marginBottom: '0.5rem' }}>
                 <AlertCircle size={16} />
                 <strong style={{ fontSize: '0.85rem' }}>Dica LIGA</strong>
               </div>
               <p style={{ fontSize: '0.8rem', color: '#B45309', lineHeight: '1.4' }}>
                 Tarefas diárias ajudam a manter a consistência e acumular mais pontos no ranking!
               </p>
            </div>
          </div>
        </aside>

        {/* Lista Principal */}
        <main className="checklist-main">
          <form onSubmit={addItem} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <input
              type="text"
              placeholder="Adicionar nova tarefa ao checklist..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              style={{
                flex: 1,
                padding: '1rem 1.5rem',
                borderRadius: '1rem',
                border: '2px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
            />
            <button
              type="submit"
              style={{
                padding: '0 2rem',
                borderRadius: '1rem',
                border: 'none',
                background: 'var(--accent)',
                color: 'white',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(255,193,7,0.3)'
              }}
            >
              <Plus size={20} /> Adicionar
            </button>
          </form>

          <div className="checklist-items" style={{ background: 'var(--bg-card)', borderRadius: '1.25rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>
                {activeCategory} {activeCategory === 'Todas' ? 'Tarefas' : ''}
              </h2>
              <button 
                onClick={clearCompleted}
                style={{ fontSize: '0.85rem', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}
              >
                Limpar Concluídas
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <div 
                    key={item.id} 
                    style={{ 
                      padding: '1rem 1.5rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1rem',
                      borderBottom: '1px solid var(--border-color)',
                      background: item.completed ? 'rgba(0,0,0,0.02)' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <button 
                      onClick={() => toggleItem(item.id)}
                      style={{ 
                        width: '26px', 
                        height: '26px', 
                        borderRadius: '6px', 
                        border: `2px solid ${item.completed ? 'var(--accent)' : 'var(--border-color)'}`,
                        background: item.completed ? 'var(--accent)' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}
                    >
                      {item.completed && <CheckSquare size={18} />}
                    </button>
                    
                    <div style={{ flex: 1 }}>
                      <p style={{ 
                        margin: 0, 
                        fontSize: '1rem', 
                        color: item.completed ? 'var(--text-muted)' : 'var(--text-heading)',
                        textDecoration: item.completed ? 'line-through' : 'none',
                        fontWeight: item.completed ? '400' : '500'
                      }}>
                        {item.text}
                      </p>
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: '700', textTransform: 'uppercase' }}>
                        {item.category}
                      </span>
                    </div>

                    <button 
                      onClick={() => removeItem(item.id)}
                      style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
                      className="hover-danger"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <ListTodo size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                  <p>Nenhuma tarefa encontrada nesta categoria.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ChecklistPage;
