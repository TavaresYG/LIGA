import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User as UserIcon, Tag } from 'lucide-react';

const SignupPage: React.FC<{ onToggleLogin: () => void }> = ({ onToggleLogin }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await signup(email, username, name, password);
    if (!success) {
      setError('E-mail ou nome de usuário já em uso.');
    }
  };

  return (
    <div className="auth-card glass">
      <div className="auth-header">
        <h2>Criar Conta</h2>
        <p>Comece a organizar suas documentações</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="field-group">
          <label>Nome Completo</label>
          <div className="input-icon">
            <UserIcon size={18} />
            <input 
              type="text" 
              placeholder="João Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="field-group">
          <label>Nome de Usuário (Apelido)</label>
          <div className="input-icon">
            <Tag size={18} />
            <input 
              type="text" 
              placeholder="joaosilva"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="field-group">
          <label>E-mail</label>
          <div className="input-icon">
            <Mail size={18} />
            <input 
              type="email" 
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

        <button type="submit" className="btn-auth-submit">Criar Conta</button>
      </form>

      <div className="auth-footer">
        Já tem uma conta? <button onClick={onToggleLogin}>Acesse aqui</button>
      </div>
    </div>
  );
};

export default SignupPage;
