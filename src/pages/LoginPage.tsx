import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User as UserIcon, Facebook, Github, Chrome, CloudIcon, Send } from 'lucide-react';

const LoginPage: React.FC<{ onToggleSignup: () => void }> = ({ onToggleSignup }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await login(identifier, password);
    if (!success) {
      setError('Credenciais inválidas. Verifique seu e-mail/usuário e senha.');
    }
  };

  const socialButtons = [
    { name: 'Google', icon: <Chrome size={20} />, color: '#ea4335' },
    { name: 'Facebook', icon: <Facebook size={20} />, color: '#1877f2' },
    { name: 'Outlook', icon: <CloudIcon size={20} />, color: '#0078d4' },
    { name: 'Yahoo', icon: <Send size={20} />, color: '#6001d2' },
  ];

  return (
    <div className="auth-card glass">
      <div className="auth-header">
        <h2>Bem-vindo de volta</h2>
        <p>Acesse seu DocCenter LIGA</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="field-group">
          <label>E-mail ou Usuário</label>
          <div className="input-icon">
            <UserIcon size={18} />
            <input 
              type="text" 
              placeholder="Digite seu e-mail ou apelido"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="field-group">
          <label>Senha</label>
          <div className="input-icon">
            <Lock size={18} />
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" className="btn-auth-submit">Entrar</button>
      </form>

      <div className="auth-divider">
        <span>Ou continue com</span>
      </div>

      <div className="social-grid">
        {socialButtons.map((btn) => (
          <button key={btn.name} className="social-btn" title={btn.name}>
            <span style={{ color: btn.color }}>{btn.icon}</span>
          </button>
        ))}
      </div>

      <div className="auth-footer">
        Não tem uma conta? <button onClick={onToggleSignup}>Crie agora</button>
      </div>
    </div>
  );
};

export default LoginPage;
