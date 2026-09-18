import React, { useState, useEffect, useMemo } from 'react';
import { api, BASE_URL } from '../api/client';
import { ArrowLeft, Home, Search, ChevronRight, BookOpen, Volume2, Copy, Check, Type } from 'lucide-react';

export const BibleWidget = ({ initialVersion = 'nvi', onNavigateHome }) => {
  const [version, setVersion] = useState(initialVersion);
  const [versionsList, setVersionsList] = useState([
    { id: 'nvi', name: 'NVI', fullName: 'Nova Versão Internacional' },
    { id: 'acf', name: 'ACF', fullName: 'Almeida Corrigida Fiel' },
    { id: 'aa', name: 'AA', fullName: 'Almeida Atualizada' }
  ]);
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);

  const [books, setBooks] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(true);

  // Navegação: 'books' | 'chapters' | 'verses'
  const [currentView, setCurrentView] = useState('books');
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(1);

  // Leitura de versículos
  const [chapterData, setChapterData] = useState(null);
  const [loadingChapter, setLoadingChapter] = useState(false);

  // Filtros e busca
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('traditional'); // 'traditional' | 'alphabetical'
  const [fontSize, setFontSize] = useState(17); // Tamanho da fonte dos versículos
  const [copiedVerse, setCopiedVerse] = useState(null);

  // Carrega lista de livros da Bíblia
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoadingBooks(true);
        const res = await api.getBibleBooks();
        if (res && res.books) {
          setBooks(res.books);
        }
      } catch (err) {
        console.warn('Erro ao carregar livros da Bíblia:', err.message);
      } finally {
        setLoadingBooks(false);
      }
    };

    fetchBooks();
  }, []);

  // Carrega versículos quando seleciona livro/capítulo/versão
  useEffect(() => {
    if (!selectedBook || currentView !== 'verses') return;

    const fetchChapter = async () => {
      try {
        setLoadingChapter(true);
        const res = await api.getBibleChapter(version, selectedBook.abbrev, selectedChapter);
        if (res) {
          setChapterData(res);
        }
      } catch (err) {
        console.warn(`Erro ao carregar ${selectedBook?.name} ${selectedChapter}:`, err.message);
      } finally {
        setLoadingChapter(false);
      }
    };

    fetchChapter();
  }, [version, selectedBook, selectedChapter, currentView]);

  // Lista filtrada e ordenada de livros
  const displayedBooks = useMemo(() => {
    let list = [...books];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((b) =>
        b.name.toLowerCase().includes(q) ||
        b.abbrev.toLowerCase().includes(q)
      );
    }

    if (sortOrder === 'alphabetical') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    } else {
      list.sort((a, b) => a.id - b.id);
    }

    return list;
  }, [books, searchQuery, sortOrder]);

  const handleSelectBook = (book) => {
    setSelectedBook(book);
    setCurrentView('chapters');
  };

  const handleSelectChapter = (chapNum) => {
    setSelectedChapter(chapNum);
    setCurrentView('verses');
  };

  const handleBack = () => {
    if (currentView === 'verses') {
      setCurrentView('chapters');
    } else if (currentView === 'chapters') {
      setCurrentView('books');
      setSelectedBook(null);
    }
  };

  const handleGoHome = () => {
    setCurrentView('books');
    setSelectedBook(null);
    setSearchQuery('');
  };

  const handleCopyVerse = (verseNum, verseText) => {
    const textToCopy = `"${verseText}" - ${selectedBook.name} ${selectedChapter}:${verseNum} (${version.toUpperCase()})`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedVerse(verseNum);
    setTimeout(() => setCopiedVerse(null), 2500);
  };

  const handlePrevChapter = () => {
    if (selectedChapter > 1) {
      setSelectedChapter(selectedChapter - 1);
    }
  };

  const handleNextChapter = () => {
    if (selectedBook && selectedChapter < selectedBook.chaptersCount) {
      setSelectedChapter(selectedChapter + 1);
    }
  };

  return (
    <div className="church-bible-card" style={{
      width: '100%',
      minHeight: '100%',
      backgroundColor: '#ffffff',
      color: '#18181b',
      overflow: 'hidden',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      boxSizing: 'border-box'
    }}>
      {/* HEADER PRINCIPAL COM NAVEGAÇÃO E SELETOR DE VERSÃO */}
      <div style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #f1f5f9',
        backgroundColor: '#ffffff',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {currentView !== 'books' && (
            <button
              onClick={handleBack}
              style={{
                backgroundColor: '#f1f5f9',
                border: '1px solid #e2e8f0',
                color: '#0f172a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                transition: 'all 0.2s'
              }}
              title="Voltar"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          <div>
            <h3 style={{
              fontSize: '1.3rem',
              fontWeight: 700,
              color: '#0f172a',
              margin: 0,
              lineHeight: 1.2
            }}>
              {currentView === 'books' && 'Livros'}
              {currentView === 'chapters' && selectedBook?.name}
              {currentView === 'verses' && `${selectedBook?.name} ${selectedChapter}`}
            </h3>
            {currentView === 'chapters' && selectedBook?.testamentName && (
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                {selectedBook.testamentName}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          {currentView !== 'books' && (
            <button
              onClick={handleGoHome}
              style={{
                backgroundColor: '#f1f5f9',
                border: '1px solid #e2e8f0',
                color: '#0f172a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                transition: 'all 0.2s'
              }}
              title="Início dos Livros"
            >
              <Home size={18} />
            </button>
          )}

          {/* Botão de Versão (ex: VERSÃO NVI) */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowVersionDropdown(!showVersionDropdown)}
              style={{
                backgroundColor: '#ffffff',
                border: '1.5px solid #27272a',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: '#18181b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}
            >
              <span>VERSÃO {version.toUpperCase()}</span>
            </button>

          {/* Dropdown de Versões */}
          {showVersionDropdown && (
            <div style={{
              position: 'absolute',
              top: '110%',
              right: 0,
              backgroundColor: '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              zIndex: 50,
              minWidth: '220px',
              overflow: 'hidden',
              padding: '4px'
            }}>
              {versionsList.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setVersion(v.id);
                    setShowVersionDropdown(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 14px',
                    border: 'none',
                    background: version === v.id ? '#f4f4f5' : 'transparent',
                    color: version === v.id ? '#000000' : '#52525b',
                    fontWeight: version === v.id ? 700 : 500,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    transition: 'background 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700 }}>{v.name}</span>
                    {version === v.id && <span style={{ color: '#3b82f6', fontSize: '11px', fontWeight: 700 }}>ATIVO</span>}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#71717a' }}>{v.fullName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. VISUALIZAÇÃO DE LIVROS */}
      {currentView === 'books' && (
        <div style={{ padding: '16px 20px' }}>
          {/* Campo de Busca */}
          <div style={{
            position: 'relative',
            marginBottom: '16px'
          }}>
            <div style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none'
            }}>
              <Search size={18} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar livro"
              style={{
                width: '100%',
                padding: '12px 14px 12px 42px',
                backgroundColor: '#f1f5f9',
                border: '1px solid transparent',
                borderRadius: '8px',
                fontSize: '0.95rem',
                color: '#1e293b',
                outline: 'none',
                transition: 'border-color 0.2s, background-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => (e.target.style.borderColor = '#cbd5e1')}
              onBlur={(e) => (e.target.style.borderColor = 'transparent')}
            />
          </div>

          {/* Abas: Tradicional | Alfabética */}
          <div style={{
            display: 'flex',
            backgroundColor: '#f1f5f9',
            borderRadius: '9999px',
            padding: '4px',
            marginBottom: '18px',
            userSelect: 'none'
          }}>
            <button
              onClick={() => setSortOrder('traditional')}
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: '9999px',
                border: 'none',
                backgroundColor: sortOrder === 'traditional' ? '#ffffff' : 'transparent',
                color: sortOrder === 'traditional' ? '#0f172a' : '#64748b',
                fontWeight: sortOrder === 'traditional' ? 700 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: sortOrder === 'traditional' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Tradicional
            </button>
            <button
              onClick={() => setSortOrder('alphabetical')}
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: '9999px',
                border: 'none',
                backgroundColor: sortOrder === 'alphabetical' ? '#ffffff' : 'transparent',
                color: sortOrder === 'alphabetical' ? '#0f172a' : '#64748b',
                fontWeight: sortOrder === 'alphabetical' ? 700 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: sortOrder === 'alphabetical' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Alfabética
            </button>
          </div>

          {/* Lista de Livros (Grid Responsivo que preenche 100% da largura) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '8px',
            maxHeight: '540px',
            overflowY: 'auto',
            padding: '4px 4px 4px 0'
          }}>
            {loadingBooks ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                Carregando livros da Bíblia...
              </div>
            ) : displayedBooks.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                Nenhum livro encontrado para "{searchQuery}".
              </div>
            ) : (
              displayedBooks.map((book) => (
                <div
                  key={book.id}
                  onClick={() => handleSelectBook(book)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <span style={{
                    fontSize: '0.98rem',
                    fontWeight: 600,
                    color: '#0f172a'
                  }}>
                    {book.name}
                  </span>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#94a3b8',
                    fontSize: '0.88rem',
                    fontWeight: 500
                  }}>
                    <span>{book.chaptersCount}</span>
                    <ChevronRight size={16} color="#cbd5e1" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. VISUALIZAÇÃO DE CAPÍTULOS */}
      {currentView === 'chapters' && selectedBook && (
        <div style={{ padding: '20px' }}>
          <div style={{
            fontSize: '0.9rem',
            color: '#64748b',
            marginBottom: '16px',
            fontWeight: 500
          }}>
            Selecione o capítulo de <strong>{selectedBook.name}</strong> ({selectedBook.testamentName}):
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))',
            gap: '10px',
            maxHeight: '420px',
            overflowY: 'auto',
            paddingRight: '4px'
          }}>
            {Array.from({ length: selectedBook.chaptersCount }, (_, i) => i + 1).map((chapNum) => (
              <button
                key={chapNum}
                onClick={() => handleSelectChapter(chapNum)}
                style={{
                  height: '52px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  color: '#0f172a',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#000000';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.borderColor = '#000000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.color = '#0f172a';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                {chapNum}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. LEITOR DE VERSÍCULOS */}
      {currentView === 'verses' && selectedBook && (
        <div style={{ padding: '20px' }}>
          {/* Controles do Leitor: Navegação de Capítulos + Tamanho da Fonte */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '14px',
            marginBottom: '16px',
            borderBottom: '1px solid #f1f5f9',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handlePrevChapter}
                disabled={selectedChapter <= 1}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: selectedChapter <= 1 ? '#f8fafc' : '#ffffff',
                  color: selectedChapter <= 1 ? '#cbd5e1' : '#0f172a',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: selectedChapter <= 1 ? 'not-allowed' : 'pointer'
                }}
              >
                ← Cap. Anterior
              </button>

              <button
                onClick={handleNextChapter}
                disabled={selectedChapter >= selectedBook.chaptersCount}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: selectedChapter >= selectedBook.chaptersCount ? '#f8fafc' : '#ffffff',
                  color: selectedChapter >= selectedBook.chaptersCount ? '#cbd5e1' : '#0f172a',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: selectedChapter >= selectedBook.chaptersCount ? 'not-allowed' : 'pointer'
                }}
              >
                Próximo Cap. →
              </button>
            </div>

            {/* Controle de Fonte */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Fonte:</span>
              <button
                onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '4px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                title="Diminuir fonte"
              >
                A-
              </button>
              <button
                onClick={() => setFontSize(Math.min(26, fontSize + 2))}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '4px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                title="Aumentar fonte"
              >
                A+
              </button>
            </div>
          </div>

          {/* Texto dos Versículos */}
          <div style={{
            maxHeight: '440px',
            overflowY: 'auto',
            paddingRight: '8px',
            lineHeight: 1.75
          }}>
            {loadingChapter ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                Carregando versículos...
              </div>
            ) : chapterData?.verses?.length ? (
              chapterData.verses.map((v) => (
                <div
                  key={v.number}
                  onClick={() => handleCopyVerse(v.number, v.text)}
                  style={{
                    marginBottom: '12px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: `${fontSize}px`,
                    color: '#1e293b',
                    transition: 'background-color 0.15s',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  title="Clique para copiar este versículo"
                >
                  <sup style={{
                    fontWeight: 800,
                    color: '#3b82f6',
                    marginRight: '6px',
                    fontSize: `${Math.max(11, fontSize - 5)}px`
                  }}>
                    {v.number}
                  </sup>
                  <span>{v.text}</span>

                  {copiedVerse === v.number && (
                    <span style={{
                      position: 'absolute',
                      right: '12px',
                      top: '8px',
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Check size={12} /> Copiado!
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                Nenhum versículo encontrado neste capítulo.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
