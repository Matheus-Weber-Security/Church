import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PublicHome } from './pages/PublicHome';
import { EditLogin } from './pages/EditLogin';
import { EditDashboard } from './pages/EditDashboard';

const MainRouter = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}>
          <div style={{
            width: '18px',
            height: '18px',
            border: '2px solid rgba(255,255,255,0.2)',
            borderTopColor: '#ffffff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <span>Carregando Church...</span>
        </div>
      </div>
    );
  }

  // Rota /edit:
  // Se logado: exibe o menu superior preto com abas Home, Usuários, etc.
  // Se não logado: exibe a tela de login com fundo preto e quadrado cinza centralizado
  if (currentPath.startsWith('/edit')) {
    if (isAuthenticated) {
      return <EditDashboard onNavigateHome={() => navigate('/')} />;
    }
    return <EditLogin onBackHome={() => navigate('/')} />;
  }

  // Rota pública para qualquer slug: / (home), /sobre, /cultos, etc.
  const rawSlug = currentPath.replace(/^\//, '').split('/')[0].trim();
  const activeSlug = rawSlug === '' ? 'home' : rawSlug;

  return (
    <PublicHome
      slug={activeSlug}
      onNavigate={(path) => navigate(path)}
    />
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
}
