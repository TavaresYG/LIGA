import React, { useState, useEffect, useCallback } from 'react';
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

interface CartItem {
  item: StoreItem;
  quantity: number;
}

const StorePage: React.FC = () => {
  const { token, user } = useAuth();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const balance = totalEarned - totalSpent;

  const fetchData = useCallback(async () => {
    if (!token) return;
    const [itemsRes, stmtRes] = await Promise.all([
      fetch(`${API_URL}/store/items`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/me/statement`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (itemsRes.ok) setItems(await itemsRes.json());
    if (stmtRes.ok) {
      const stmt = await stmtRes.json();
      const earned = stmt.filter((e: any) => e.points > 0).reduce((s: number, e: any) => s + e.points, 0);
      const spent  = stmt.filter((e: any) => e.points < 0).reduce((s: number, e: any) => s + Math.abs(e.points), 0);
      setTotalEarned(earned);
      setTotalSpent(spent);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Cart helpers
  const cartTotal = cart.reduce((s, c) => s + c.item.cost_points * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const addToCart = (item: StoreItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) {
        const maxQty = item.stock;
        if (existing.quantity >= maxQty) return prev;
        return prev.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === itemId);
      if (!existing) return prev;
      if (existing.quantity === 1) return prev.filter(c => c.item.id !== itemId);
      return prev.map(c => c.item.id === itemId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  };

  const removeAllFromCart = (itemId: string) => {
    setCart(prev => prev.filter(c => c.item.id !== itemId));
  };

  const getCartQty = (itemId: string) => cart.find(c => c.item.id === itemId)?.quantity ?? 0;

  const handleCheckout = async () => {
    if (cart.length === 0 || !token) return;
    if (cartTotal > balance) {
      setErrorMsg(`Saldo insuficiente. Saldo: ${balance.toLocaleString()} pts | Carrinho: ${cartTotal.toLocaleString()} pts`);
      return;
    }
    setCheckingOut(true);
    const errors: string[] = [];
    for (const cartItem of cart) {
      for (let i = 0; i < cartItem.quantity; i++) {
        const res = await fetch(`${API_URL}/redemptions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ itemId: cartItem.item.id }),
        });
        if (!res.ok) {
          const d = await res.json();
          errors.push(`${cartItem.item.name}: ${d.error}`);
        }
      }
    }
    setCheckingOut(false);
    setCart([]);
    setShowCart(false);
    if (errors.length > 0) {
      setErrorMsg('Alguns itens falharam: ' + errors.join(' | '));
    } else {
      setSuccessMsg(`✅ ${cartCount} resgate(s) concluído(s)! Aguarde a entrega.`);
      fetchData();
    }
    setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, 6000);
  };

  const categories = ['Todos', ...Array.from(new Set(items.map(i => i.category_name).filter(Boolean)))];
  const filtered = selectedCategory === 'Todos' ? items : items.filter(i => i.category_name === selectedCategory);

  return (
    <div className="store-page">

      {/* Header */}
      <div className="store-header">
        <div>
          <h1 className="store-title">🛍️ Loja de Resgates</h1>
          <p className="store-subtitle">Troque seus pontos por recompensas incríveis</p>
        </div>

        {/* Cart Button */}
        <button
          className={`cart-fab ${cartCount > 0 ? 'has-items' : ''}`}
          onClick={() => setShowCart(true)}
        >
          🛒 <span className="cart-label">Carrinho</span>
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </button>
      </div>

      {/* Summary Cards (same style as statement page) */}
      <div className="store-summary">
        <div className="store-summary-card earned">
          <span className="summary-icon">📈</span>
          <div>
            <span className="summary-label">Total ganho</span>
            <span className="summary-value">+{totalEarned.toLocaleString()} pts</span>
          </div>
        </div>
        <div className="store-summary-card spent">
          <span className="summary-icon">🛍️</span>
          <div>
            <span className="summary-label">Total resgatado</span>
            <span className="summary-value">-{totalSpent.toLocaleString()} pts</span>
          </div>
        </div>
        <div className="store-summary-card balance">
          <span className="summary-icon">💰</span>
          <div>
            <span className="summary-label">Saldo disponível</span>
            <span className="summary-value">{balance.toLocaleString()} pts</span>
          </div>
        </div>
        {cartCount > 0 && (
          <div className="store-summary-card cart-preview" onClick={() => setShowCart(true)}>
            <span className="summary-icon">🛒</span>
            <div>
              <span className="summary-label">No carrinho</span>
              <span className="summary-value" style={{ color: '#f59e0b' }}>-{cartTotal.toLocaleString()} pts</span>
            </div>
          </div>
        )}
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
          ) : filtered.map(item => {
            const qty = getCartQty(item.id);
            const canAdd = item.stock > 0 && balance >= item.cost_points && qty < item.stock;

            return (
              <div key={item.id} className={`item-card ${item.stock === 0 ? 'out-of-stock' : ''} ${qty > 0 ? 'in-cart' : ''}`}>
                <div className="item-image-wrap">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="item-img" />
                  ) : (
                    <div className="item-img-placeholder">🎁</div>
                  )}
                  {item.stock === 0 && <div className="out-badge">Esgotado</div>}
                  {item.category_name && <span className="cat-tag">{item.category_name}</span>}
                  {qty > 0 && <div className="in-cart-badge">✓ {qty} no carrinho</div>}
                </div>
                <div className="item-body">
                  <h3 className="item-name">{item.name}</h3>
                  {item.notes && <p className="item-notes">{item.notes}</p>}
                  <div className="item-footer">
                    <div className="item-cost">
                      <span className="cost-pts">✨ {item.cost_points.toLocaleString()} pts</span>
                      <span className="stock-info">Estoque: {item.stock}</span>
                    </div>

                    {/* Cart quantity controls */}
                    {qty > 0 ? (
                      <div className="qty-controls">
                        <button className="qty-btn minus" onClick={() => removeFromCart(item.id)}>−</button>
                        <span className="qty-display">{qty}</span>
                        <button
                          className={`qty-btn plus ${!canAdd ? 'disabled' : ''}`}
                          onClick={() => canAdd && addToCart(item)}
                          disabled={!canAdd}
                        >+</button>
                      </div>
                    ) : (
                      <button
                        className={`btn-redeem ${!canAdd ? 'disabled' : ''}`}
                        disabled={!canAdd}
                        onClick={() => canAdd && addToCart(item)}
                      >
                        {item.stock === 0 ? 'Esgotado' : balance < item.cost_points ? 'Saldo insuficiente' : '🛒 Adicionar'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== CART SIDEBAR ===== */}
      {showCart && (
        <div className="cart-overlay" onClick={() => setShowCart(false)}>
          <div className="cart-sidebar" onClick={e => e.stopPropagation()}>
            <div className="cart-header">
              <h3>🛒 Meu Carrinho</h3>
              <button className="btn-close-cart" onClick={() => setShowCart(false)}>✕</button>
            </div>

            {cart.length === 0 ? (
              <div className="cart-empty">
                <span style={{ fontSize: '3rem' }}>🛒</span>
                <p>Seu carrinho está vazio.</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Adicione itens para continuar.</p>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map(({ item, quantity }) => (
                    <div key={item.id} className="cart-item-row">
                      <div className="cart-item-img">
                        {item.image_url ? <img src={item.image_url} alt={item.name} /> : <span>🎁</span>}
                      </div>
                      <div className="cart-item-info">
                        <span className="cart-item-name">{item.name}</span>
                        <span className="cart-item-cost">{(item.cost_points * quantity).toLocaleString()} pts</span>
                      </div>
                      <div className="cart-qty-group">
                        <button className="qty-btn minus" onClick={() => removeFromCart(item.id)}>−</button>
                        <span className="qty-display">{quantity}</span>
                        <button
                          className={`qty-btn plus ${quantity >= item.stock ? 'disabled' : ''}`}
                          onClick={() => addToCart(item)}
                          disabled={quantity >= item.stock}
                        >+</button>
                      </div>
                      <button className="cart-remove" onClick={() => removeAllFromCart(item.id)} title="Remover">×</button>
                    </div>
                  ))}
                </div>

                <div className="cart-footer">
                  <div className="cart-summary-line">
                    <span>Itens</span><span>{cartCount}</span>
                  </div>
                  <div className="cart-summary-line">
                    <span>Saldo disponível</span>
                    <span style={{ color: 'var(--accent)' }}>{balance.toLocaleString()} pts</span>
                  </div>
                  <div className="cart-summary-line total">
                    <span>Total do carrinho</span>
                    <span style={{ color: cartTotal > balance ? '#ef4444' : 'var(--text-heading)' }}>
                      {cartTotal.toLocaleString()} pts
                    </span>
                  </div>
                  {cartTotal > balance && (
                    <div className="cart-insufficient">⚠️ Saldo insuficiente para este carrinho</div>
                  )}
                  <button
                    className={`btn-checkout ${cartTotal > balance || checkingOut ? 'disabled' : ''}`}
                    disabled={cartTotal > balance || checkingOut}
                    onClick={handleCheckout}
                  >
                    {checkingOut ? 'Processando...' : `✅ Finalizar Resgate — ${cartTotal.toLocaleString()} pts`}
                  </button>
                  <button className="btn-clear-cart" onClick={() => setCart([])}>Limpar carrinho</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default StorePage;
