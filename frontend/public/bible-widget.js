/**
 * Church Bible Widget - Script Universal da Bíblia Sagrada (NVI, ACF, AA)
 * Renderiza a interface da Bíblia em qualquer elemento com id="church-bible-app" ou classe .church-bible-widget
 */
(function () {
  const getApiUrl = () => {
    if (typeof window !== 'undefined') {
      if (window.__CHURCH_API_URL__ && window.__CHURCH_API_URL__ !== '/api') {
        return window.__CHURCH_API_URL__;
      }
      if (window.location && window.location.hostname && window.location.hostname.includes('igrejaelcana.com.br')) {
        return 'https://api.igrejaelcana.com.br/api';
      }
    }
    return '/api';
  };

  const createBibleWidget = (container) => {
    if (!container || container.dataset.bibleInitialized) return;
    container.dataset.bibleInitialized = 'true';

    let state = {
      version: 'nvi',
      versionsList: [
        { id: 'nvi', name: 'NVI', fullName: 'Nova Versão Internacional' },
        { id: 'acf', name: 'ACF', fullName: 'Almeida Corrigida Fiel' },
        { id: 'aa', name: 'AA', fullName: 'Almeida Atualizada' }
      ],
      showDropdown: false,
      books: [],
      loadingBooks: true,
      currentView: 'books', // 'books' | 'chapters' | 'verses'
      selectedBook: null,
      selectedChapter: 1,
      searchQuery: '',
      sortOrder: 'traditional',
      fontSize: 17,
      chapterData: null,
      loadingChapter: false,
      copiedVerse: null
    };

    const fetchBooks = async () => {
      try {
        state.loadingBooks = true;
        render();
        const apiBase = getApiUrl();
        const res = await fetch(`${apiBase}/bible/books`).then(r => r.json());
        if (res && res.books) {
          state.books = res.books;
        }
      } catch (err) {
        console.warn('Erro ao carregar livros da Bíblia:', err);
      } finally {
        state.loadingBooks = false;
        render();
      }
    };

    const fetchChapter = async () => {
      if (!state.selectedBook) return;
      try {
        state.loadingChapter = true;
        render();
        const apiBase = getApiUrl();
        const res = await fetch(`${apiBase}/bible/${state.version}/${state.selectedBook.abbrev}/${state.selectedChapter}`).then(r => r.json());
        if (res) {
          state.chapterData = res;
        }
      } catch (err) {
        console.warn('Erro ao carregar versículos:', err);
      } finally {
        state.loadingChapter = false;
        render();
      }
    };

    const getFilteredBooks = () => {
      let list = [...state.books];
      if (state.searchQuery.trim()) {
        const q = state.searchQuery.toLowerCase().trim();
        list = list.filter(b => b.name.toLowerCase().includes(q) || b.abbrev.toLowerCase().includes(q));
      }
      if (state.sortOrder === 'alphabetical') {
        list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      } else {
        list.sort((a, b) => a.id - b.id);
      }
      return list;
    };

    const render = () => {
      const filteredBooks = getFilteredBooks();

      container.innerHTML = `
        <div class="church-bible-root" style="width:100%;max-width:680px;margin:0 auto;background:#ffffff;color:#18181b;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,0.08);overflow:hidden;border:1px solid #e4e4e7;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;text-align:left;">
          
          <!-- HEADER PRINCIPAL COM NAVEGAÇÃO E SELETOR DE VERSÃO -->
          <div style="padding:16px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f1f5f9;background:#ffffff;position:relative;">
            <div style="display:flex;align-items:center;gap:10px;">
              ${state.currentView !== 'books' ? `
                <button id="bible-btn-back" style="background:#f1f5f9;border:1px solid #e2e8f0;color:#0f172a;cursor:pointer;display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:8px;transition:all 0.2s;" title="Voltar">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
                </button>
              ` : ''}
              <div>
                <h3 style="font-size:1.3rem;font-weight:700;color:#0f172a;margin:0;line-height:1.2;">
                  ${state.currentView === 'books' ? 'Livros' : ''}
                  ${state.currentView === 'chapters' ? (state.selectedBook?.name || '') : ''}
                  ${state.currentView === 'verses' ? `${state.selectedBook?.name || ''} ${state.selectedChapter}` : ''}
                </h3>
                ${state.currentView === 'chapters' && state.selectedBook?.testamentName ? `
                  <div style="font-size:0.75rem;color:#64748b;font-weight:500;">${state.selectedBook.testamentName}</div>
                ` : ''}
              </div>
            </div>

            <div style="display:flex;align-items:center;gap:8px;position:relative;">
              ${state.currentView !== 'books' ? `
                <button id="bible-btn-home" style="background:#f1f5f9;border:1px solid #e2e8f0;color:#0f172a;cursor:pointer;display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:8px;transition:all 0.2s;" title="Início dos Livros">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </button>
              ` : ''}

              <div style="position:relative;">
                <button id="bible-btn-version" style="background:#ffffff;border:1.5px solid #27272a;border-radius:6px;padding:6px 12px;font-size:0.8rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#18181b;cursor:pointer;display:flex;align-items:center;gap:4px;">
                  <span>VERSÃO ${state.version.toUpperCase()}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
                </button>

                ${state.showDropdown ? `
                  <div id="bible-dropdown-menu" style="position:absolute;top:115%;right:0;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,0.15);z-index:50;min-width:220px;overflow:hidden;padding:4px;">
                    ${state.versionsList.map(v => `
                      <button class="bible-version-option" data-version="${v.id}" style="width:100%;text-align:left;padding:10px 14px;border:none;background:${state.version === v.id ? '#f4f4f5' : 'transparent'};color:${state.version === v.id ? '#000000' : '#52525b'};font-weight:${state.version === v.id ? '700' : '500'};font-size:0.88rem;cursor:pointer;border-radius:6px;display:flex;flex-direction:column;gap:2px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                          <span style="font-weight:700;">${v.name}</span>
                          ${state.version === v.id ? '<span style="color:#3b82f6;font-size:11px;font-weight:700;">ATIVO</span>' : ''}
                        </div>
                        <span style="font-size:0.75rem;color:#71717a;">${v.fullName}</span>
                      </button>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- VIEW: LIVROS -->
          ${state.currentView === 'books' ? `
            <div style="padding:16px 20px;">
              <!-- Input Busca -->
              <div style="position:relative;margin-bottom:16px;">
                <div style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#94a3b8;display:flex;align-items:center;pointer-events:none;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </div>
                <input id="bible-search-input" type="text" value="${state.searchQuery}" placeholder="Buscar livro" style="width:100%;padding:12px 14px 12px 42px;background:#f1f5f9;border:1px solid transparent;border-radius:8px;font-size:0.95rem;color:#1e293b;outline:none;box-sizing:border-box;">
              </div>

              <!-- Abas: Tradicional | Alfabética -->
              <div style="display:flex;background:#f1f5f9;border-radius:9999px;padding:4px;margin-bottom:18px;user-select:none;">
                <button id="bible-tab-traditional" style="flex:1;padding:8px 16px;border-radius:9999px;border:none;background:${state.sortOrder === 'traditional' ? '#ffffff' : 'transparent'};color:${state.sortOrder === 'traditional' ? '#0f172a' : '#64748b'};font-weight:${state.sortOrder === 'traditional' ? '700' : '500'};font-size:0.9rem;cursor:pointer;box-shadow:${state.sortOrder === 'traditional' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};">
                  Tradicional
                </button>
                <button id="bible-tab-alphabetical" style="flex:1;padding:8px 16px;border-radius:9999px;border:none;background:${state.sortOrder === 'alphabetical' ? '#ffffff' : 'transparent'};color:${state.sortOrder === 'alphabetical' ? '#0f172a' : '#64748b'};font-weight:${state.sortOrder === 'alphabetical' ? '700' : '500'};font-size:0.9rem;cursor:pointer;box-shadow:${state.sortOrder === 'alphabetical' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};">
                  Alfabética
                </button>
              </div>

              <!-- Lista de Livros -->
              <div style="max-height:420px;overflow-y:auto;padding-right:4px;">
                ${state.loadingBooks ? '<div style="text-align:center;padding:40px 20px;color:#64748b;">Carregando livros da Bíblia...</div>' : ''}
                ${!state.loadingBooks && filteredBooks.length === 0 ? `<div style="text-align:center;padding:40px 20px;color:#64748b;">Nenhum livro encontrado para "${state.searchQuery}".</div>` : ''}
                ${filteredBooks.map(b => `
                  <div class="bible-book-item" data-book-id="${b.id}" style="display:flex;align-items:center;justify-content:space-between;padding:14px 12px;border-bottom:1px solid #f1f5f9;cursor:pointer;border-radius:6px;transition:background-color 0.15s;">
                    <span style="font-size:1.02rem;font-weight:600;color:#0f172a;">${b.name}</span>
                    <div style="display:flex;align-items:center;gap:8px;color:#94a3b8;font-size:0.92rem;font-weight:500;">
                      <span>${b.chaptersCount}</span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- VIEW: CAPÍTULOS -->
          ${state.currentView === 'chapters' && state.selectedBook ? `
            <div style="padding:20px;">
              <div style="font-size:0.9rem;color:#64748b;margin-bottom:16px;font-weight:500;">
                Selecione o capítulo de <strong>${state.selectedBook.name}</strong> (${state.selectedBook.testamentName || ''}):
              </div>

              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:10px;max-height:420px;overflow-y:auto;padding-right:4px;">
                ${Array.from({ length: state.selectedBook.chaptersCount }, (_, i) => i + 1).map(chapNum => `
                  <button class="bible-chapter-btn" data-chapter="${chapNum}" style="height:52px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;color:#0f172a;font-size:1.05rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;">
                    ${chapNum}
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- VIEW: VERSÍCULOS -->
          ${state.currentView === 'verses' && state.selectedBook ? `
            <div style="padding:20px;">
              <!-- Barra de Controles -->
              <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;margin-bottom:16px;border-bottom:1px solid #f1f5f9;flex-wrap:wrap;gap:10px;">
                <div style="display:flex;gap:8px;">
                  <button id="bible-btn-prev-chap" ${state.selectedChapter <= 1 ? 'disabled' : ''} style="padding:6px 12px;border-radius:6px;border:1px solid #e2e8f0;background:${state.selectedChapter <= 1 ? '#f8fafc' : '#ffffff'};color:${state.selectedChapter <= 1 ? '#cbd5e1' : '#0f172a'};font-size:0.82rem;font-weight:600;cursor:${state.selectedChapter <= 1 ? 'not-allowed' : 'pointer'};">
                    ← Cap. Anterior
                  </button>
                  <button id="bible-btn-next-chap" ${state.selectedChapter >= state.selectedBook.chaptersCount ? 'disabled' : ''} style="padding:6px 12px;border-radius:6px;border:1px solid #e2e8f0;background:${state.selectedChapter >= state.selectedBook.chaptersCount ? '#f8fafc' : '#ffffff'};color:${state.selectedChapter >= state.selectedBook.chaptersCount ? '#cbd5e1' : '#0f172a'};font-size:0.82rem;font-weight:600;cursor:${state.selectedChapter >= state.selectedBook.chaptersCount ? 'not-allowed' : 'pointer'};">
                    Próximo Cap. →
                  </button>
                </div>

                <div style="display:flex;align-items:center;gap:6px;">
                  <span style="font-size:0.78rem;color:#64748b;font-weight:600;">Fonte:</span>
                  <button id="bible-btn-font-dec" style="width:28px;height:28px;border-radius:4px;border:1px solid #e2e8f0;background:#ffffff;font-weight:700;cursor:pointer;">A-</button>
                  <button id="bible-btn-font-inc" style="width:28px;height:28px;border-radius:4px;border:1px solid #e2e8f0;background:#ffffff;font-weight:700;cursor:pointer;">A+</button>
                </div>
              </div>

              <!-- Lista de Versículos -->
              <div style="max-height:440px;overflow-y:auto;padding-right:8px;line-height:1.75;">
                ${state.loadingChapter ? '<div style="text-align:center;padding:50px 20px;color:#64748b;">Carregando versículos...</div>' : ''}
                ${!state.loadingChapter && state.chapterData?.verses?.length ? state.chapterData.verses.map(v => `
                  <div class="bible-verse-item" data-verse-num="${v.number}" data-verse-text="${encodeURIComponent(v.text)}" style="margin-bottom:12px;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:${state.fontSize}px;color:#1e293b;position:relative;" title="Clique para copiar este versículo">
                    <sup style="font-weight:800;color:#3b82f6;margin-right:6px;font-size:${Math.max(11, state.fontSize - 5)}px;">${v.number}</sup>
                    <span>${v.text}</span>
                    ${state.copiedVerse === v.number ? '<span style="position:absolute;right:12px;top:8px;background:#10b981;color:#ffffff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;">✔ Copiado!</span>' : ''}
                  </div>
                `).join('') : ''}
              </div>
            </div>
          ` : ''}

        </div>
      `;

      attachEvents();
    };

    const attachEvents = () => {
      const backBtn = container.querySelector('#bible-btn-back');
      if (backBtn) {
        backBtn.onclick = () => {
          if (state.currentView === 'verses') {
            state.currentView = 'chapters';
          } else if (state.currentView === 'chapters') {
            state.currentView = 'books';
            state.selectedBook = null;
          }
          render();
        };
      }

      const homeBtn = container.querySelector('#bible-btn-home');
      if (homeBtn) {
        homeBtn.onclick = () => {
          state.currentView = 'books';
          state.selectedBook = null;
          state.searchQuery = '';
          render();
        };
      }

      const versionBtn = container.querySelector('#bible-btn-version');
      if (versionBtn) {
        versionBtn.onclick = (e) => {
          e.stopPropagation();
          state.showDropdown = !state.showDropdown;
          render();
        };
      }

      container.querySelectorAll('.bible-version-option').forEach(el => {
        el.onclick = () => {
          const v = el.dataset.version;
          state.version = v;
          state.showDropdown = false;
          if (state.currentView === 'verses') {
            fetchChapter();
          } else {
            render();
          }
        };
      });

      const searchInput = container.querySelector('#bible-search-input');
      if (searchInput) {
        searchInput.oninput = (e) => {
          state.searchQuery = e.target.value;
          const booksContainer = container.querySelector('.bible-book-item')?.parentElement;
          if (booksContainer) {
            const filtered = getFilteredBooks();
            if (filtered.length === 0) {
              booksContainer.innerHTML = `<div style="text-align:center;padding:40px 20px;color:#64748b;">Nenhum livro encontrado para "${state.searchQuery}".</div>`;
            } else {
              booksContainer.innerHTML = filtered.map(b => `
                <div class="bible-book-item" data-book-id="${b.id}" style="display:flex;align-items:center;justify-content:space-between;padding:14px 12px;border-bottom:1px solid #f1f5f9;cursor:pointer;border-radius:6px;transition:background-color 0.15s;">
                  <span style="font-size:1.02rem;font-weight:600;color:#0f172a;">${b.name}</span>
                  <div style="display:flex;align-items:center;gap:8px;color:#94a3b8;font-size:0.92rem;font-weight:500;">
                    <span>${b.chaptersCount}</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                </div>
              `).join('');
            }
            attachBookClicks();
          } else {
            render();
          }
        };
      }

      const tabTrad = container.querySelector('#bible-tab-traditional');
      if (tabTrad) {
        tabTrad.onclick = () => {
          state.sortOrder = 'traditional';
          render();
        };
      }

      const tabAlpha = container.querySelector('#bible-tab-alphabetical');
      if (tabAlpha) {
        tabAlpha.onclick = () => {
          state.sortOrder = 'alphabetical';
          render();
        };
      }

      attachBookClicks();

      container.querySelectorAll('.bible-chapter-btn').forEach(el => {
        el.onmouseenter = () => {
          el.style.backgroundColor = '#000000';
          el.style.color = '#ffffff';
          el.style.borderColor = '#000000';
        };
        el.onmouseleave = () => {
          el.style.backgroundColor = '#f8fafc';
          el.style.color = '#0f172a';
          el.style.borderColor = '#e2e8f0';
        };
        el.onclick = () => {
          state.selectedChapter = parseInt(el.dataset.chapter, 10);
          state.currentView = 'verses';
          fetchChapter();
        };
      });

      const prevChap = container.querySelector('#bible-btn-prev-chap');
      if (prevChap) {
        prevChap.onclick = () => {
          if (state.selectedChapter > 1) {
            state.selectedChapter--;
            fetchChapter();
          }
        };
      }

      const nextChap = container.querySelector('#bible-btn-next-chap');
      if (nextChap) {
        nextChap.onclick = () => {
          if (state.selectedBook && state.selectedChapter < state.selectedBook.chaptersCount) {
            state.selectedChapter++;
            fetchChapter();
          }
        };
      }

      const fontDec = container.querySelector('#bible-btn-font-dec');
      if (fontDec) {
        fontDec.onclick = () => {
          state.fontSize = Math.max(14, state.fontSize - 2);
          render();
        };
      }

      const fontInc = container.querySelector('#bible-btn-font-inc');
      if (fontInc) {
        fontInc.onclick = () => {
          state.fontSize = Math.min(26, state.fontSize + 2);
          render();
        };
      }

      container.querySelectorAll('.bible-verse-item').forEach(el => {
        el.onmouseenter = () => {
          el.style.backgroundColor = '#f8fafc';
        };
        el.onmouseleave = () => {
          el.style.backgroundColor = 'transparent';
        };
        el.onclick = () => {
          const num = parseInt(el.dataset.verseNum, 10);
          const txt = decodeURIComponent(el.dataset.verseText || '');
          const copyStr = `"${txt}" - ${state.selectedBook?.name} ${state.selectedChapter}:${num} (${state.version.toUpperCase()})`;
          navigator.clipboard.writeText(copyStr);
          state.copiedVerse = num;
          render();
          setTimeout(() => {
            state.copiedVerse = null;
            render();
          }, 2500);
        };
      });
    };

    const attachBookClicks = () => {
      container.querySelectorAll('.bible-book-item').forEach(el => {
        el.onmouseenter = () => {
          el.style.backgroundColor = '#f8fafc';
        };
        el.onmouseleave = () => {
          el.style.backgroundColor = 'transparent';
        };
        el.onclick = () => {
          const bookId = parseInt(el.dataset.bookId, 10);
          const found = state.books.find(b => b.id === bookId);
          if (found) {
            state.selectedBook = found;
            state.currentView = 'chapters';
            render();
          }
        };
      });
    };

    fetchBooks();
  };

  // Inicializador global automático
  const initAllBibleWidgets = () => {
    document.querySelectorAll('#church-bible-app, .church-bible-widget').forEach(createBibleWidget);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllBibleWidgets);
  } else {
    initAllBibleWidgets();
  }

  // Observer para detecção dinâmica ao trocar de abas
  const observer = new MutationObserver(() => {
    initAllBibleWidgets();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.initChurchBible = createBibleWidget;
})();
