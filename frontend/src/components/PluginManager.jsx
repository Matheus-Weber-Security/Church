import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  Puzzle,
  Plus,
  ShieldCheck,
  Trash2,
  Check,
  X,
  RefreshCw,
  Search,
  ExternalLink,
  Lock,
  Sparkles,
  Layers,
  Power
} from 'lucide-react';

export const PluginManager = () => {
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  // Form State para Novo Plugin
  const [newPlugin, setNewPlugin] = useState({
    name: '',
    package_name: '',
    description: '',
    category: 'Comunidade',
    cdn_url: ''
  });

  const loadPlugins = async () => {
    try {
      setLoading(true);
      const data = await api.getPlugins();
      setPlugins(data.plugins || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar lista de plugins.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlugins();
  }, []);

  const handleToggle = async (plugin) => {
    try {
      setTogglingId(plugin.id);
      await api.togglePlugin(plugin.id);
      await loadPlugins();
    } catch (err) {
      alert(err.message || 'Erro ao alternar status do plugin.');
    } finally {
      setTogglingId(null);
    }
  };

  const [validating, setValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [validationStatusText, setValidationStatusText] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleCreatePlugin = async (e) => {
    e.preventDefault();
    setValidationError('');
    setValidating(true);
    setValidationProgress(15);
    setValidationStatusText('Iniciando validação do plugin...');

    try {
      // Se houver URL do CDN, valida se o script é acessível antes de ativar
      if (newPlugin.cdn_url && newPlugin.cdn_url.trim()) {
        const cleanUrl = newPlugin.cdn_url.trim();
        setValidationProgress(40);
        setValidationStatusText('Testando conexão com o servidor CDN...');

        await new Promise((resolve, reject) => {
          const testScript = document.createElement('script');
          testScript.src = cleanUrl;
          testScript.async = true;
          const timeout = setTimeout(() => {
            testScript.remove();
            reject(new Error('Tempo limite excedido ao tentar conectar ao CDN.'));
          }, 8000);

          testScript.onload = () => {
            clearTimeout(timeout);
            resolve();
          };
          testScript.onerror = () => {
            clearTimeout(timeout);
            testScript.remove();
            reject(new Error('A URL do CDN não é válida ou o script está inacessível.'));
          };
          document.head.appendChild(testScript);
        });

        setValidationProgress(75);
        setValidationStatusText('Script validado com sucesso! Integrando ao editor...');
      } else {
        setValidationProgress(60);
        setValidationStatusText('Registrando configurações do pacote...');
      }

      setValidationProgress(90);
      setValidationStatusText('Gravando no banco de dados...');
      await api.createPlugin(newPlugin);

      setValidationProgress(100);
      setValidationStatusText('✔ Plugin ativado com 100% de sucesso!');
      await new Promise((r) => setTimeout(r, 600));

      setIsModalOpen(false);
      setNewPlugin({
        name: '',
        package_name: '',
        description: '',
        category: 'Comunidade',
        cdn_url: ''
      });
      await loadPlugins();
    } catch (err) {
      setValidationError(err.message || 'Erro ao cadastrar ou validar o plugin.');
    } finally {
      setValidating(false);
      setValidationProgress(0);
      setValidationStatusText('');
    }
  };

  const handleDeletePlugin = async (plugin) => {
    if (plugin.is_native === 1) {
      alert('Este plugin é nativo do sistema e não pode ser excluído.');
      return;
    }

    if (!window.confirm(`Tem certeza de que deseja remover o plugin "${plugin.name}"?`)) return;

    try {
      await api.deletePlugin(plugin.id);
      await loadPlugins();
      alert('Plugin removido com sucesso.');
    } catch (err) {
      alert(err.message || 'Erro ao excluir plugin.');
    }
  };

  // Filtragem e Métricas
  const categories = ['Todas', ...new Set(plugins.map((p) => p.category || 'Geral'))];

  const filteredPlugins = plugins.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.package_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPlugins = plugins.length;
  const activePlugins = plugins.filter((p) => p.is_enabled === 1).length;
  const nativePluginsCount = plugins.filter((p) => p.is_native === 1).length;

  return (
    <div className="container-main">
      {/* Header com Título e Métricas */}
      <div className="section-header">
        <div>
          <h1 className="section-title">
            <Puzzle size={26} color="#60a5fa" />
            <span>Gerenciador de Plugins do GrapesJS</span>
          </h1>
          <p className="section-subtitle">
            Ative, desative e integre novos blocos, temas e extensões ao seu editor visual.
          </p>
        </div>

        <div className="action-buttons">
          <button
            id="btn-add-plugin"
            className="btn-accent"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={18} />
            <span>Adicionar Plugin</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{ backgroundColor: '#14141a', border: '1px solid #282833', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.82rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 600 }}>Total Instalados</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', marginTop: '0.25rem' }}>{totalPlugins}</div>
        </div>
        <div style={{ backgroundColor: '#14141a', border: '1px solid #282833', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.82rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 600 }}>Plugins Ativos no Editor</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34d399', marginTop: '0.25rem' }}>{activePlugins}</div>
        </div>
        <div style={{ backgroundColor: '#14141a', border: '1px solid #282833', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.82rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 600 }}>Nativos (Protegidos)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#60a5fa', marginTop: '0.25rem' }}>{nativePluginsCount}</div>
        </div>
      </div>

      {error && <div className="alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      {/* Barra de Busca e Filtro de Categoria */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ position: 'relative', minWidth: '280px', flex: 1, maxWidth: '450px' }}>
          <Search size={16} color="#71717a" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por nome, pacote ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Categoria:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="btn-secondary"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                backgroundColor: selectedCategory === cat ? '#3b82f6' : '#1f1f28',
                borderColor: selectedCategory === cat ? '#3b82f6' : '#2e2e38',
                color: '#ffffff'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Plugins */}
      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '32%' }}>Plugin / Pacote</th>
              <th style={{ width: '38%' }}>Descrição & Categoria</th>
              <th style={{ width: '14%' }}>Tipo</th>
              <th style={{ width: '8%' }}>Status</th>
              <th style={{ width: '8%', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  Carregando lista de plugins...
                </td>
              </tr>
            ) : filteredPlugins.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  Nenhum plugin encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              filteredPlugins.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{p.name}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#9ca3af', fontFamily: 'monospace', marginTop: '2px' }}>
                        {p.package_name}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                      {p.description || '(Sem descrição)'}
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        backgroundColor: '#23232f',
                        color: '#94a3b8',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        fontWeight: 600
                      }}>
                        {p.category}
                      </span>
                    </div>
                  </td>
                  <td>
                    {p.is_native === 1 ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        color: '#60a5fa',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        <Lock size={12} /> Nativo do Sistema
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        Personalizado
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggle(p)}
                      disabled={togglingId === p.id}
                      style={{
                        background: p.is_enabled ? '#10b981' : '#374151',
                        border: 'none',
                        color: '#ffffff',
                        padding: '5px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s'
                      }}
                      title={p.is_enabled ? 'Clique para desativar do editor' : 'Clique para ativar no editor'}
                    >
                      <Power size={11} />
                      <span>{p.is_enabled ? 'Ativo' : 'Inativo'}</span>
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {p.is_native === 1 ? (
                      <button
                        className="btn-secondary"
                        disabled
                        style={{
                          opacity: 0.4,
                          cursor: 'not-allowed',
                          padding: '0.4rem 0.6rem',
                          fontSize: '0.75rem'
                        }}
                        title="Plugins nativos são protegidos e não podem ser excluídos."
                      >
                        <Lock size={13} />
                      </button>
                    ) : (
                      <button
                        className="btn-secondary"
                        onClick={() => handleDeletePlugin(p)}
                        style={{
                          color: '#f87171',
                          padding: '0.4rem 0.6rem',
                          fontSize: '0.75rem'
                        }}
                        title="Excluir plugin"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para Adicionar Novo Plugin */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Adicionar Novo Plugin GrapesJS</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Cadastre um plugin da comunidade GrapesJS informando os dados e a URL do CDN/Script JavaScript.
            </p>

            <form onSubmit={handleCreatePlugin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Nome de Exibição</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Plugin de Animações"
                  value={newPlugin.name}
                  onChange={(e) => setNewPlugin({ ...newPlugin, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Identificador / Pacote (Package Name)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: grapesjs-animate"
                  value={newPlugin.package_name}
                  onChange={(e) => setNewPlugin({ ...newPlugin, package_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select
                  className="form-input"
                  value={newPlugin.category}
                  onChange={(e) => setNewPlugin({ ...newPlugin, category: e.target.value })}
                >
                  <option value="Estrutura">Estrutura</option>
                  <option value="Formulários">Formulários</option>
                  <option value="Mídia & Dinâmico">Mídia & Dinâmico</option>
                  <option value="Navegação">Navegação</option>
                  <option value="Estilos">Estilos</option>
                  <option value="Avançado">Avançado</option>
                  <option value="Comunidade">Comunidade</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Descrição das Funcionalidades</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Descreva o que este plugin adiciona ao editor..."
                  value={newPlugin.description}
                  onChange={(e) => setNewPlugin({ ...newPlugin, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">URL do CDN / Script (Opcional se já estiver no bundle)</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://unpkg.com/grapesjs-animate@latest/dist/index.js"
                  value={newPlugin.cdn_url}
                  onChange={(e) => setNewPlugin({ ...newPlugin, cdn_url: e.target.value })}
                />
              </div>

              {validationError && (
                <div className="alert-error" style={{ fontSize: '0.85rem' }}>
                  {validationError}
                </div>
              )}

              {validating && (
                <div style={{
                  backgroundColor: '#181820',
                  border: '1px solid #3b82f6',
                  borderRadius: '8px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                    <span style={{ color: '#93c5fd', fontWeight: 600 }}>{validationStatusText}</span>
                    <span style={{ color: '#3b82f6', fontWeight: 700 }}>{validationProgress}%</span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: '#272736',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${validationProgress}%`,
                      height: '100%',
                      backgroundColor: '#3b82f6',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={validating}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-accent"
                  disabled={validating}
                  style={{ minWidth: '160px' }}
                >
                  {validating ? `Validando (${validationProgress}%)...` : 'Cadastrar Plugin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
