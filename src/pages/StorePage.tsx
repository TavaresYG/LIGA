import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/store.css';

const API_URL = 'http://localhost:5000/api';

interface StoreItem {
  id: string;
  name: string;
  cost_points: number;
  stock: number;
  category_name: string;
  notes: string;
  image_url: string;
  active: boolean;
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

const StorePage: React.FC = () => {
  const { token, user } = useAuth();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<StoreItem | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch(`${API_URL}/store/items`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/ranking?period=geral`, { headers: { Authorization: `Bearer ${token}` } }),
    ]).then(async ([itemsRes, rankRes]) => {
      if (itemsRes.ok) setItems(await itemsRes.json());
      if (rankRes.ok) {
        const rank = await rankRes.json();
        const me = rank.find((r: any) => r.id === (user as any)?.id || r.username === (user as any)?.username);
        if (me) setBalance(me.balance);
      }
      setLoading(false);
    });
  }, [token]);

  const categories = ['Todos', ...Array.from(new Set(items.map(i => i.category_name).filter(Boolean)))];
  const filtered = selectedCategory === 'Todos' ? items : items.filter(i => i.category_name === selectedCategory);

  const handleRedeem = async () => {
    if (!confirmItem || !token) return;
    setRedeemingId(confirmItem.id);
    try {
      const res = await fetch(`${API_URL}/redemptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemId: confirmItem.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`✅ Resgate de "${confirmItem.name}" realizado! Aguarde a entrega.`);
        setItems(prev => prev.map(i => i.id === confirmItem.id ? { ...i, stock: i.stock - 1 } : i));
        setBalance(prev => prev - confirmItem.cost_points);
      } else {
        setErrorMsg(data.error || 'Erro ao resgatar');
      }
    } finally {
      setRedeemingId(null);
      setConfirmItem(null);
    }
    setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, 5000);
  };

  return (
    <div className="store-page">
      <div className="store-header">
        <div>
          <h1 className="store-title">🛍️ Loja de Resgates</h1>
          <p className="store-subtitle">Troque seus pontos por recompensas incríveis</p>
        </div>
        <div className="balance-badge">
          <span className="balance-label">Seu saldo</span>
          <span className="balance-value">💰 {balance.toLocaleString()} pts</span>
        </div>
      </div>

      {successMsg && <div className="store-alert success">{successMsg}</div>}
      {errorMsg && <div className="store-alert error">{errorMsg}</div>}

      {/* Category Filter */}
      <div className="category-filter">
        {categories.map(cat => (
          <button
            key={cat}
            className={`cat-btn ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="store-loading">Carregando itens...</div>
      ) : (
        <div className="items-grid">
          {filtered.length === 0 ? (
            <div className="store-empty">Nenhum item disponível nesta categoria.</div>
          ) : filtered.map(item => (
            <div key={item.id} className={`item-card ${item.stock === 0 ? 'out-of-stock' : ''}`}>
              <div className="item-image-wrap">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="item-img" />
                ) : (
                  <div className="item-img-placeholder">🎁</div>
                )}
                {item.stock === 0 && <div className="out-badge">Esgotado</div>}
                {item.category_name && <span className="cat-tag">{item.category_name}</span>}
              </div>
              <div className="item-body">
                <h3 className="item-name">{item.name}</h3>
                {item.notes && <p className="item-notes">{item.notes}</p>}
                <div className="item-footer">
                  <div className="item-cost">
                    <span className="cost-pts">✨ {item.cost_points.toLocaleString()} pts</span>
                    <span className="stock-info">Estoque: {item.stock}</span>
                  </div>
                  <button
                    className={`btn-redeem ${item.stock === 0 || balance < item.cost_points ? 'disabled' : ''}`}
                    disabled={item.stock === 0 || balance < item.cost_points}
                    onClick={() => setConfirmItem(item)}
                  >
                    {item.stock === 0 ? 'Esgotado' : balance < item.cost_points ? 'Saldo insuficiente' : 'Resgatar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmItem && (
        <div className="modal-overlay" onClick={() => setConfirmItem(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Confirmar Resgate</h3>
            <p>Você está prestes a resgatar:</p>
            <div className="confirm-item-row">
              {confirmItem.image_url ? <img src={confirmItem.image_url} alt="" className="confirm-img" /> : <span style={{ fontSize: '2rem' }}>🎁</span>}
              <div>
                <strong>{confirmItem.name}</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Custo: {confirmItem.cost_points.toLocaleString()} pts</div>
                <div style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>Saldo após resgate: {(balance - confirmItem.cost_points).toLocaleString()} pts</div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel-modal" onClick={() => setConfirmItem(null)}>Cancelar</button>
              <button className="btn-confirm-modal" onClick={handleRedeem} disabled={!!redeemingId}>
                {redeemingId ? 'Processando...' : 'Confirmar Resgate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorePage;
