import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, FileText, LogOut, ExternalLink, Shield, BookOpen, Puzzle, Sparkles } from 'lucide-react';

export const Navbar = ({ activeTab, setActiveTab, onNavigateHome }) => {
  const { user, logout, isAdmin } = useAuth();

  return (
    <nav className="top-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div className="nav-brand">
          <span>CHURCH</span>
          <span className="nav-brand-badge">Painel de Edição</span>
        </div>

        <div className="nav-links">
          <button
            id="nav-tab-home"
            className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            <LayoutDashboard size={17} />
            <span>Home</span>
          </button>

          <button
            id="nav-tab-plugins"
            className={`nav-btn ${activeTab === 'plugins' ? 'active' : ''}`}
            onClick={() => setActiveTab('plugins')}
          >
            <Puzzle size={17} />
            <span>Plugins</span>
          </button>

          <button
            id="nav-tab-ai"
            className={`nav-btn ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
            style={{
              borderColor: activeTab === 'ai' ? '#fbbf24' : undefined,
              color: activeTab === 'ai' ? '#fde68a' : undefined
            }}
            title="Assistente de Inteligência Artificial Godolfredo"
          >
            <Sparkles size={17} color={activeTab === 'ai' ? '#fbbf24' : '#a78bfa'} />
            <span>IA (Godolfredo)</span>
          </button>

          {isAdmin && (
            <button
              id="nav-tab-users"
              className={`nav-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={17} />
              <span>Usuários</span>
            </button>
          )}

          {isAdmin && (
            <button
              id="nav-tab-logs"
              className={`nav-btn ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              <FileText size={17} />
              <span>Logs de Acesso</span>
            </button>
          )}
        </div>
      </div>

      <div className="nav-user-controls">
        <a
          href="/manual.html"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-btn"
          style={{ fontSize: '0.85rem', color: '#60a5fa', textDecoration: 'none' }}
          title="Abrir Apostila e Manual do Usuário para impressão ou salvar em PDF"
        >
          <BookOpen size={15} />
          <span>Manual (PDF)</span>
        </a>

        <button
          onClick={onNavigateHome}
          className="nav-btn"
          style={{ fontSize: '0.85rem', color: '#9ca3af' }}
          title="Ver página principal em uma nova aba ou navegar"
        >
          <ExternalLink size={15} />
          <span>Ver Site</span>
        </button>

        <div className="user-tag">
          <Shield size={14} color="#a1a1aa" />
          <span>{user?.username}</span>
          <span className={`badge-role ${user?.role === 'admin' ? 'badge-admin' : 'badge-editor'}`}>
            {user?.role}
          </span>
        </div>

        <button
          id="btn-logout"
          onClick={logout}
          className="nav-logout-btn"
          title="Encerrar sessão com segurança"
        >
          <LogOut size={15} />
          <span>Sair</span>
        </button>
      </div>
    </nav>
  );
};
