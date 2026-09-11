import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { ArrowLeft } from 'lucide-react';

export const PublicHome = ({ slug = 'home', onNavigate }) => {
  const [pageData, setPageData] = useState({ html: '', css: '', title: '', exists: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        setLoading(true);
        const data = await api.getPage(slug);
        if (data) {
          setPageData({
            html: data.html || '',
            css: data.css || '',
            title: data.title || '',
            exists: data.exists !== false
          });
        }
      } catch (err) {
        console.warn(`Erro ao carregar página "${slug}":`, err.message);
        setPageData({ html: '', css: '', title: '', exists: false });
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [slug]);

  // Se a página for a inicial 'home' e não tiver conteúdo salvo:
  // Preserva: "A página principal 'localhost:porta/' deve estar em branco inicialmente."
  const isBlank = slug === 'home' && (!pageData.html || !pageData.html.trim());

  if (!loading && isBlank) {
    return <div className="public-home-blank" />;
  }

  // Se uma página secundária específica não existir ou estiver vazia
  if (!loading && (!pageData.exists || (!pageData.html && slug !== 'home'))) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#09090b',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>Página Não Encontrada</h1>
        <p style={{ color: '#a1a1aa', maxWidth: '480px', marginBottom: '2rem', lineHeight: 1.6 }}>
          A página <code>/{slug}</code> ainda não foi criada no editor ou está sem conteúdo publicado.
        </p>
        <div>
          <button onClick={() => onNavigate('/')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={16} />
            <span>Voltar para o Início</span>
          </button>
        </div>
      </div>
    );
  }

  // Quando houver layout criado e salvo no GrapesJS:
  return (
    <div className="public-home-container" style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Injeção dinâmica do CSS compilado pelo GrapesJS */}
      {pageData.css && (
        <style dangerouslySetInnerHTML={{ __html: pageData.css }} />
      )}

      {/* Renderização do HTML visual gerado pelo GrapesJS */}
      <div dangerouslySetInnerHTML={{ __html: pageData.html }} />
    </div>
  );
};
