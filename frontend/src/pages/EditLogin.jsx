import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, KeyRound, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export const EditLogin = ({ onBackHome }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Por favor, preencha o usuário e a senha.');
      return;
    }

    try {
      setLoading(true);
      await login(username.trim(), password.trim());
    } catch (err) {
      setError(err.message || 'Credenciais inválidas. Verifique os dados.');
    } finally {
      setLoading(false);
    }
  };

  const fillDefaultCredentials = () => {
    setUsername('root');
    setPassword('C1234');
    setError('');
  };

  return (
    <div className="login-container">
      {/* Quadrado cinza central */}
      <div className="login-gray-box">
        <div className="login-header">
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            backgroundColor: '#17171d',
            border: '1px solid #33333f',
            marginBottom: '0.75rem',
            color: '#ffffff'
          }}>
            <Lock size={24} />
          </div>
          <h1 className="login-title">Acesso ao Painel</h1>
          <p className="login-subtitle">Entre com suas credenciais para editar o Church</p>
        </div>

        {error && (
          <div className="alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="input-username">Usuário</label>
            <div style={{ position: 'relative' }}>
              <input
                id="input-username"
                type="text"
                className="form-input"
                placeholder="Ex: root"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="input-password">Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                id="input-password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            id="btn-submit-login"
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? (
              <span>Autenticando...</span>
            ) : (
              <>
                <span>Entrar no Painel</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Dica de Acesso com as credenciais root / C1234 */}
        <div className="credentials-tip">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Acesso Inicial Root:</span>
            <button
              type="button"
              onClick={fillDefaultCredentials}
              style={{
                background: 'none',
                border: 'none',
                color: '#60a5fa',
                cursor: 'pointer',
                fontSize: '0.78rem',
                textDecoration: 'underline'
              }}
            >
              Preencher automático
            </button>
          </div>
          <div style={{ marginTop: '0.25rem', fontFamily: 'monospace', fontSize: '0.82rem' }}>
            Usuário: <strong>root</strong> | Senha: <strong>C1234</strong>
          </div>
        </div>

        {onBackHome && (
          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <button
              onClick={onBackHome}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.82rem'
              }}
            >
              ← Voltar para a página inicial
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
