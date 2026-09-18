import React, { useEffect, useRef, useState } from 'react';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import gjsPresetWebpage from 'grapesjs-preset-webpage';
import gjsBlocksBasic from 'grapesjs-blocks-basic';
import gjsForms from 'grapesjs-plugin-forms';
import gjsCustomCode from 'grapesjs-custom-code';
import gjsStyleBg from 'grapesjs-style-bg';
import gjsCountdown from 'grapesjs-component-countdown';
import gjsTabs from 'grapesjs-tabs';
import gjsTooltip from 'grapesjs-tooltip';
import gjsCkeditor from 'grapesjs-plugin-ckeditor';
import { api, getAuthToken, BASE_URL } from '../api/client';
import {
  Save,
  Monitor,
  Tablet,
  Smartphone,
  Undo2,
  Redo2,
  Trash2,
  Code2,
  CheckCircle2,
  AlertCircle,
  Plus,
  FolderOpen,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Layers,
  X,
  Pencil,
  Search
} from 'lucide-react';

export const HomeEditor = () => {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const [editorInstance, setEditorInstance] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [activeDevice, setActiveDevice] = useState('desktop');

  // Modo Preview e Alternador de Lápis
  const [isPreviewActive, setIsPreviewActive] = useState(false);

  // Sistema de Notificações / Toast Popups Flutuantes (Erros, Sucesso e Avisos do Editor e Uploads)
  const [toastNotification, setToastNotification] = useState(null);

  const showToast = (type, message, title = null, duration = 6000) => {
    const id = Date.now();
    let defaultTitle = 'Aviso';
    if (type === 'error') defaultTitle = 'Erro no Upload ou Editor';
    if (type === 'success') defaultTitle = 'Sucesso';
    if (type === 'loading') defaultTitle = 'Processando...';

    setToastNotification({
      id,
      type,
      title: title || defaultTitle,
      message
    });

    if (duration > 0 && type !== 'loading') {
      setTimeout(() => {
        setToastNotification((prev) => (prev && prev.id === id ? null : prev));
      }, duration);
    }
  };

  // Estados de Carregamento com Porcentagem
  const [editorLoading, setEditorLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(15);
  const [loadingStatusText, setLoadingStatusText] = useState('Iniciando o estúdio visual...');

  // Gerenciamento de Múltiplas Páginas
  const [pages, setPages] = useState([{ slug: 'home', title: 'Home' }]);
  const [currentPage, setCurrentPage] = useState('home');
  const currentPageRef = useRef('home');
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Armazenamento em memória do código customizado (HTML e CSS) por página para preservação total de comentários
  const customCodeByPageRef = useRef({});

  const [isNewPageModalOpen, setIsNewPageModalOpen] = useState(false);
  const [newPageData, setNewPageData] = useState({ title: '', slug: '' });

  // Modal de Confirmação para Excluir Imagem da Pasta Uploads
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    filename: '',
    src: '',
    assetEl: null
  });
  const [isDeletingAsset, setIsDeletingAsset] = useState(false);

  const handleCancelDelete = () => {
    if (isDeletingAsset) return;
    setDeleteConfirmModal({ isOpen: false, filename: '', src: '', assetEl: null });
  };

  const handleConfirmDelete = async () => {
    const filename = deleteConfirmModal.filename;
    const assetEl = deleteConfirmModal.assetEl;
    const assetSrc = deleteConfirmModal.src;

    // Função auxiliar para remover o asset da galeria e do AssetManager do GrapesJS
    const purgeAssetFromUI = () => {
      // 1. Remove o asset do AssetManager em memória do GrapesJS
      if (editorRef.current && editorRef.current.AssetManager) {
        const am = editorRef.current.AssetManager;
        const allAssets = am.getAll();
        const targetModel = allAssets.find((a) => {
          const aSrc = a.get ? (a.get('src') || '') : (a.src || '');
          const aName = a.get ? (a.get('name') || '') : (a.name || '');
          const aFilename = a.get ? (a.get('filename') || '') : (a.filename || '');
          return (
            (filename && (aSrc.includes(filename) || aName === filename || aFilename === filename)) ||
            (assetSrc && aSrc === assetSrc)
          );
        });
        if (targetModel) {
          am.remove(targetModel);
        }
      }

      // 2. Remove o card DOM da galeria
      if (assetEl && assetEl.parentNode) {
        assetEl.remove();
      }

      // 3. Fecha o modal de confirmação
      setDeleteConfirmModal({ isOpen: false, filename: '', src: '', assetEl: null });
    };

    if (!filename) {
      purgeAssetFromUI();
      return;
    }

    setIsDeletingAsset(true);
    try {
      const res = await api.deleteAsset(filename);
      purgeAssetFromUI();
      if (res && res.deleted === false) {
        showToast('warning', `A imagem "${filename}" não existia mais no servidor e foi removida da galeria.`, 'Galeria Atualizada');
      } else {
        showToast('success', `A imagem "${filename}" foi excluída com sucesso da pasta de uploads.`, 'Imagem Excluída!');
      }
    } catch (err) {
      console.warn('Aviso ao excluir imagem do servidor:', err);
      // Se não encontrada (404) ou erro de remoção, remove da interface mesmo assim para não travar o card
      if (err.message && (err.message.includes('não encontrada') || err.message.includes('404'))) {
        purgeAssetFromUI();
        showToast('warning', `A imagem "${filename}" não estava mais no servidor e foi removida da galeria.`, 'Card Removido');
      } else {
        showToast('error', `Falha ao excluir imagem do servidor: ${err.message}`, 'Erro na Exclusão');
      }
    } finally {
      setIsDeletingAsset(false);
    }
  };

  // Formata o código HTML com aninhamento hierárquico profissional e preservação total de comentários
  const formatHtml = (html) => {
    if (!html) return '';
    const trimmed = html.trim();

    // Regex para dividir tags HTML, comentários (<!-- ... -->) e DOCTYPE
    const regex = /(<!--[\s\S]*?-->|<\/?[a-zA-Z0-9-]+(?:\s+[^>]*)?>|<!DOCTYPE[^>]*>)/gi;

    const rawTokens = [];
    let lastIdx = 0;
    let match;

    while ((match = regex.exec(trimmed)) !== null) {
      if (match.index > lastIdx) {
        const text = trimmed.slice(lastIdx, match.index);
        rawTokens.push({ type: 'text', content: text });
      }
      const val = match[0];
      if (val.startsWith('<!--')) {
        rawTokens.push({ type: 'comment', content: val });
      } else if (val.startsWith('</')) {
        const tagNameMatch = val.match(/<\/([a-zA-Z0-9-]+)/);
        rawTokens.push({ type: 'closingTag', content: val, tag: tagNameMatch ? tagNameMatch[1].toLowerCase() : '' });
      } else if (val.startsWith('<') && !val.startsWith('<!')) {
        const tagNameMatch = val.match(/<([a-zA-Z0-9-]+)/);
        const isSelfClosing = val.endsWith('/>');
        rawTokens.push({
          type: 'openingTag',
          content: val,
          tag: tagNameMatch ? tagNameMatch[1].toLowerCase() : '',
          isSelfClosing
        });
      } else {
        rawTokens.push({ type: 'other', content: val });
      }
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < trimmed.length) {
      const text = trimmed.slice(lastIdx);
      rawTokens.push({ type: 'text', content: text });
    }

    const voidTags = ['img', 'br', 'hr', 'input', 'link', 'meta', 'source', 'area', 'col', 'embed', 'param', 'track', 'wbr'];

    const tab = '  ';
    let indent = 0;
    const lines = [];

    for (let i = 0; i < rawTokens.length; i++) {
      const token = rawTokens[i];

      if (token.type === 'comment') {
        const prevToken = i > 0 ? rawTokens[i - 1] : null;
        const prevPrevToken = i > 1 ? rawTokens[i - 2] : null;

        let attachedToPrev = false;
        let space = '';

        if (prevToken && (prevToken.type === 'closingTag' || prevToken.type === 'openingTag' || prevToken.type === 'comment')) {
          attachedToPrev = true;
        } else if (prevToken && prevToken.type === 'text' && !prevToken.content.includes('\n') && prevPrevToken && (prevPrevToken.type === 'closingTag' || prevPrevToken.type === 'openingTag' || prevPrevToken.type === 'comment')) {
          attachedToPrev = true;
          space = prevToken.content.includes(' ') ? ' ' : '';
        }

        if (attachedToPrev && lines.length > 0) {
          lines[lines.length - 1] = lines[lines.length - 1] + space + token.content;
        } else {
          lines.push(tab.repeat(indent) + token.content);
        }
      } else if (token.type === 'closingTag') {
        indent = Math.max(0, indent - 1);
        lines.push(tab.repeat(indent) + token.content);
      } else if (token.type === 'openingTag') {
        const isVoid = voidTags.includes(token.tag) || token.isSelfClosing;
        lines.push(tab.repeat(indent) + token.content);
        if (!isVoid) {
          indent++;
        }
      } else if (token.type === 'text') {
        const cleanText = token.content.trim();
        if (cleanText) {
          lines.push(tab.repeat(indent) + cleanText);
        }
      } else if (token.type === 'other') {
        lines.push(tab.repeat(indent) + token.content);
      }
    }

    return lines.join('\n');
  };

  // Formata o código CSS com regras e blocos aninhados profissionalmente e preservação total de comentários
  const formatCss = (css) => {
    if (!css) return '';
    const trimmed = css.trim();

    // 1. Protege URLs e dados base64 (evita quebrar ponto-e-vírgula dentro de url(...))
    const urls = [];
    const protectedUrls = trimmed.replace(/url\([^)]+\)/gi, (match) => {
      const id = `___CSS_URL_${urls.length}___`;
      urls.push(match);
      return id;
    });

    // 2. Protege comentários CSS
    const comments = [];
    const protectedCss = protectedUrls.replace(/\/\*[\s\S]*?\*\//g, (match) => {
      const id = `___CSS_COMMENT_${comments.length}___`;
      comments.push(match);
      return id;
    });

    // 3. Normaliza quebras de linha e estrutura chaves e ponto-e-vírgula preservando comentários inline
    let clean = protectedCss.replace(/\r\n/g, '\n').trim();

    clean = clean.replace(/;(?!\s*___CSS_COMMENT_)/g, ';\n');
    clean = clean.replace(/;(?:[ \t]*)(___CSS_COMMENT_\d+___)/g, '; $1\n');

    clean = clean.replace(/\s*\{\s*(?!___CSS_COMMENT_)/g, ' {\n');
    clean = clean.replace(/\s*\{(?:[ \t]*)(___CSS_COMMENT_\d+___)/g, ' { $1\n');

    clean = clean.replace(/\s*\}\s*(?!___CSS_COMMENT_)/g, '\n}\n\n');
    clean = clean.replace(/\s*\}(?:[ \t]*)(___CSS_COMMENT_\d+___)/g, '\n} $1\n\n');

    const lines = clean.split('\n');
    let indent = 0;
    const tab = '  ';
    let formatted = '';

    for (let rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line === '}' || line.startsWith('}')) {
        indent = Math.max(0, indent - 1);
        formatted += tab.repeat(indent) + line + '\n\n';
      } else if (line.endsWith('{') || line.includes('{ ___CSS_COMMENT_')) {
        formatted += tab.repeat(indent) + line + '\n';
        indent++;
      } else {
        const colonIdx = line.indexOf(':');
        let formattedLine = line;
        if (colonIdx > 0 && !line.startsWith('@') && !line.includes('{')) {
          const prop = line.slice(0, colonIdx).trim();
          const val = line.slice(colonIdx + 1).trim();
          formattedLine = `${prop}: ${val}`;
        }
        formatted += tab.repeat(indent) + formattedLine + '\n';
      }
    }

    let finalCss = formatted.trim();

    // Restaura URLs
    urls.forEach((url, idx) => {
      finalCss = finalCss.replace(`___CSS_URL_${idx}___`, url);
    });

    // Restaura Comentários com função de substituição segura contra símbolos de cifrão ($)
    comments.forEach((comment, idx) => {
      finalCss = finalCss.replace(`___CSS_COMMENT_${idx}___`, () => comment);
    });

    return finalCss;
  };

  // ==========================================
  // MODAL NATIVO REACT DE EDIÇÃO DE CÓDIGO LIVRE (HTML & CSS)
  // ==========================================
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isSavingCodeModal, setIsSavingCodeModal] = useState(false);
  const htmlHostRef = useRef(null);
  const cssHostRef = useRef(null);
  const htmlViewerRef = useRef(null);
  const cssViewerRef = useRef(null);
  const htmlSearchInputRef = useRef(null);
  const cssSearchInputRef = useRef(null);

  const [htmlSearchQuery, setHtmlSearchQuery] = useState('');
  const [cssSearchQuery, setCssSearchQuery] = useState('');
  const [htmlMatchInfo, setHtmlMatchInfo] = useState({ current: 0, total: 0 });
  const [cssMatchInfo, setCssMatchInfo] = useState({ current: 0, total: 0 });

  const htmlMatchesRef = useRef([]);
  const htmlCurrentMatchIdxRef = useRef(-1);
  const htmlActiveMarkerRef = useRef(null);
  const htmlAllMarkersRef = useRef([]);

  const cssMatchesRef = useRef([]);
  const cssCurrentMatchIdxRef = useRef(-1);
  const cssActiveMarkerRef = useRef(null);
  const cssAllMarkersRef = useRef([]);

  const clearEditorMarks = (type) => {
    if (type === 'html') {
      htmlAllMarkersRef.current.forEach((m) => { try { m.clear(); } catch (e) {} });
      htmlAllMarkersRef.current = [];
      if (htmlActiveMarkerRef.current) {
        try { htmlActiveMarkerRef.current.clear(); } catch (e) {}
        htmlActiveMarkerRef.current = null;
      }
      htmlMatchesRef.current = [];
      htmlCurrentMatchIdxRef.current = -1;
      setHtmlMatchInfo({ current: 0, total: 0 });
    } else {
      cssAllMarkersRef.current.forEach((m) => { try { m.clear(); } catch (e) {} });
      cssAllMarkersRef.current = [];
      if (cssActiveMarkerRef.current) {
        try { cssActiveMarkerRef.current.clear(); } catch (e) {}
        cssActiveMarkerRef.current = null;
      }
      cssMatchesRef.current = [];
      cssCurrentMatchIdxRef.current = -1;
      setCssMatchInfo({ current: 0, total: 0 });
    }
  };

  const jumpToMatch = (type, idx) => {
    const isHtml = type === 'html';
    const matches = isHtml ? htmlMatchesRef.current : cssMatchesRef.current;
    const viewer = isHtml ? htmlViewerRef.current : cssViewerRef.current;
    if (!matches.length || !viewer) return;

    const cm = viewer.getEditor && viewer.getEditor();
    if (!cm) return;

    let targetIdx = idx;
    if (targetIdx >= matches.length) targetIdx = 0;
    if (targetIdx < 0) targetIdx = matches.length - 1;

    if (isHtml) {
      htmlCurrentMatchIdxRef.current = targetIdx;
      setHtmlMatchInfo({ current: targetIdx + 1, total: matches.length });
    } else {
      cssCurrentMatchIdxRef.current = targetIdx;
      setCssMatchInfo({ current: targetIdx + 1, total: matches.length });
    }

    const m = matches[targetIdx];
    const activeMarkerRef = isHtml ? htmlActiveMarkerRef : cssActiveMarkerRef;
    if (activeMarkerRef.current) {
      try { activeMarkerRef.current.clear(); } catch (e) {}
      activeMarkerRef.current = null;
    }

    try {
      activeMarkerRef.current = cm.markText(
        { line: m.line, ch: m.startCh },
        { line: m.line, ch: m.endCh },
        { className: 'cm-search-highlight-active' }
      );
      cm.scrollIntoView({ line: m.line, ch: m.startCh }, 140);
      cm.setSelection({ line: m.line, ch: m.startCh }, { line: m.line, ch: m.endCh });
    } catch (e) {}
  };

  const performSearch = (type, queryText) => {
    const isHtml = type === 'html';
    const viewer = isHtml ? htmlViewerRef.current : cssViewerRef.current;
    if (!viewer) return;
    const cm = viewer.getEditor && viewer.getEditor();
    if (!cm) return;

    clearEditorMarks(type);

    const query = (queryText || '').trim();
    if (!query) return;

    const lowerQuery = query.toLowerCase();
    const lineCount = cm.lineCount();
    const found = [];
    const allMarkers = [];

    for (let line = 0; line < lineCount; line++) {
      const text = cm.getLine(line);
      let pos = text.toLowerCase().indexOf(lowerQuery);
      while (pos !== -1) {
        found.push({ line, startCh: pos, endCh: pos + query.length });
        pos = text.toLowerCase().indexOf(lowerQuery, pos + 1);
      }
    }

    if (found.length === 0) {
      if (isHtml) {
        setHtmlMatchInfo({ current: 0, total: 0 });
      } else {
        setCssMatchInfo({ current: 0, total: 0 });
      }
      return;
    }

    found.forEach((m) => {
      try {
        const marker = cm.markText(
          { line: m.line, ch: m.startCh },
          { line: m.line, ch: m.endCh },
          { className: 'cm-search-highlight-all' }
        );
        allMarkers.push(marker);
      } catch (e) {}
    });

    if (isHtml) {
      htmlMatchesRef.current = found;
      htmlAllMarkersRef.current = allMarkers;
    } else {
      cssMatchesRef.current = found;
      cssAllMarkersRef.current = allMarkers;
    }

    jumpToMatch(type, 0);
  };

  const handleSearchKeyDown = (type, e) => {
    const isHtml = type === 'html';
    const query = isHtml ? htmlSearchQuery : cssSearchQuery;
    const matches = isHtml ? htmlMatchesRef.current : cssMatchesRef.current;
    const currentIdx = isHtml ? htmlCurrentMatchIdxRef.current : cssCurrentMatchIdxRef.current;

    if (e.key === 'Enter') {
      e.preventDefault();
      if (!matches.length) {
        performSearch(type, query);
      } else {
        if (e.shiftKey) {
          jumpToMatch(type, currentIdx - 1);
        } else {
          jumpToMatch(type, currentIdx + 1);
        }
      }
    } else if (e.key === 'Escape') {
      if (isHtml) {
        setHtmlSearchQuery('');
      } else {
        setCssSearchQuery('');
      }
      clearEditorMarks(type);
      e.target.blur();
    }
  };

  // Inicializa visualizadores CodeMirror dentro do modal React com tema Hopscotch e realce oficial
  useEffect(() => {
    if (!isCodeModalOpen || !editorRef.current) return;

    const ed = editorRef.current;
    const cm = ed.CodeManager;

    setHtmlSearchQuery('');
    setCssSearchQuery('');
    setHtmlMatchInfo({ current: 0, total: 0 });
    setCssMatchInfo({ current: 0, total: 0 });
    clearEditorMarks('html');
    clearEditorMarks('css');

    // Cria os visualizadores CodeMirror usando a API nativa do GrapesJS
    const htmlViewer = cm.createViewer({
      codeName: 'htmlmixed',
      theme: 'hopscotch',
      readOnly: false,
      autoFormat: false
    });

    const cssViewer = cm.createViewer({
      codeName: 'css',
      theme: 'hopscotch',
      readOnly: false,
      autoFormat: false
    });

    htmlViewerRef.current = htmlViewer;
    cssViewerRef.current = cssViewer;

    if (htmlHostRef.current) {
      htmlHostRef.current.innerHTML = '';
      htmlHostRef.current.appendChild(htmlViewer.getElement());
    }

    if (cssHostRef.current) {
      cssHostRef.current.innerHTML = '';
      cssHostRef.current.appendChild(cssViewer.getElement());
    }

    // Carrega o código atual da página garantindo SEMPRE auto-formatação e aninhamento
    const savedCode = customCodeByPageRef.current[currentPage];
    const rawHtml = (savedCode && savedCode.html !== undefined && savedCode.html !== null && savedCode.html !== '')
      ? savedCode.html
      : (ed.getHtml() || '');
    const rawCss = (savedCode && savedCode.css !== undefined && savedCode.css !== null && savedCode.css !== '')
      ? savedCode.css
      : (ed.getCss() || '');

    const initialHtml = formatHtml(rawHtml);
    const initialCss = formatCss(rawCss);

    htmlViewer.setContent(initialHtml);
    cssViewer.setContent(initialCss);

    const t1 = setTimeout(() => {
      const htmlCm = htmlViewer.getEditor && htmlViewer.getEditor();
      if (htmlCm) {
        htmlCm.setOption('readOnly', false);
        htmlCm.setOption('lineWrapping', true);
        htmlCm.setOption('tabSize', 2);
        htmlCm.setOption('indentUnit', 2);
        htmlCm.setOption('indentWithTabs', false);
        htmlCm.setOption('smartIndent', true);
        htmlCm.setOption('extraKeys', {
          'Tab': (cm) => {
            if (cm.somethingSelected()) {
              cm.indentSelection('add');
            } else {
              cm.replaceSelection('  ', 'end');
            }
          },
          'Shift-Tab': (cm) => {
            cm.indentSelection('subtract');
          },
          'Ctrl-F': () => htmlSearchInputRef.current?.focus(),
          'Cmd-F': () => htmlSearchInputRef.current?.focus()
        });
        htmlCm.refresh();
      }

      const cssCm = cssViewer.getEditor && cssViewer.getEditor();
      if (cssCm) {
        cssCm.setOption('readOnly', false);
        cssCm.setOption('lineWrapping', true);
        cssCm.setOption('tabSize', 2);
        cssCm.setOption('indentUnit', 2);
        cssCm.setOption('indentWithTabs', false);
        cssCm.setOption('smartIndent', true);
        cssCm.setOption('extraKeys', {
          'Tab': (cm) => {
            if (cm.somethingSelected()) {
              cm.indentSelection('add');
            } else {
              cm.replaceSelection('  ', 'end');
            }
          },
          'Shift-Tab': (cm) => {
            cm.indentSelection('subtract');
          },
          'Ctrl-F': () => cssSearchInputRef.current?.focus(),
          'Cmd-F': () => cssSearchInputRef.current?.focus()
        });
        cssCm.refresh();
      }
    }, 60);

    const t2 = setTimeout(() => {
      htmlViewer.getEditor && htmlViewer.getEditor().refresh();
      cssViewer.getEditor && cssViewer.getEditor().refresh();
    }, 200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearEditorMarks('html');
      clearEditorMarks('css');
      htmlViewerRef.current = null;
      cssViewerRef.current = null;
    };
  }, [isCodeModalOpen]);

  // Fecha modal com Escape caso a barra de busca não esteja ativa
  useEffect(() => {
    if (!isCodeModalOpen) return;
    const handleGlobalEsc = (e) => {
      if (e.key === 'Escape') {
        if (
          document.activeElement !== htmlSearchInputRef.current &&
          document.activeElement !== cssSearchInputRef.current
        ) {
          setIsCodeModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalEsc);
    return () => window.removeEventListener('keydown', handleGlobalEsc);
  }, [isCodeModalOpen]);

  // Aplica o código editado no editor GrapesJS e salva no banco de dados SQLite com preservação de comentários
  const handleSaveCodeModal = async () => {
    if (!editorRef.current || !htmlViewerRef.current || !cssViewerRef.current) return;
    setIsSavingCodeModal(true);
    try {
      const newHtml = htmlViewerRef.current.getContent();
      const newCss = cssViewerRef.current.getContent();

      // Preserva o código exato digitado pelo usuário (com todos os comentários HTML e CSS intactos)
      customCodeByPageRef.current[currentPage] = {
        html: newHtml,
        css: newCss
      };

      editorRef.current.setComponents(newHtml);
      editorRef.current.setStyle(newCss);
      setTimeout(() => injectCanvasStyles(editorRef.current), 150);

      // Salva imediatamente no banco de dados SQLite para persistência definitiva
      const pageInfo = pages.find((p) => p.slug === currentPage);
      const projectData = editorRef.current.getProjectData();
      await api.savePage(currentPage, {
        title: pageInfo?.title || currentPage,
        html: newHtml,
        css: newCss,
        project_data: JSON.stringify(projectData)
      });

      setIsCodeModalOpen(false);
      showToast('success', 'Código HTML e CSS salvo e aplicado com sucesso! Comentários preservados.', 'Código Salvo!');
    } catch (err) {
      console.error('Erro ao salvar código no editor:', err);
      showToast('error', `Falha ao salvar código: ${err.message}`, 'Erro no Código');
    } finally {
      setIsSavingCodeModal(false);
    }
  };

  // Carrega lista de páginas
  const loadPagesList = async () => {
    try {
      const data = await api.getPages();
      if (data && data.pages && data.pages.length > 0) {
        setPages(data.pages);
      }
    } catch (err) {
      console.warn('Erro ao listar páginas:', err.message);
    }
  };

  // Injeta estilos no iframe do canvas para garantir rolagem fluida e espaço extra no rodapé
  const injectCanvasStyles = (editor) => {
    if (!editor || !editor.Canvas) return;
    try {
      const doc = editor.Canvas.getDocument();
      if (!doc || !doc.head) return;

      let styleEl = doc.getElementById('church-canvas-scroll-fix');
      if (!styleEl) {
        styleEl = doc.createElement('style');
        styleEl.id = 'church-canvas-scroll-fix';
        doc.head.appendChild(styleEl);
      }

      styleEl.innerHTML = `
        html {
          height: 100% !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          scroll-behavior: smooth;
        }
        body {
          min-height: 100% !important;
          /* Folga generosa para ver e editar até o final da página com conforto */
          padding-bottom: 320px !important;
          box-sizing: border-box !important;
        }
        /* Barra de rolagem estilizada e claramente visível */
        ::-webkit-scrollbar {
          width: 10px !important;
          height: 10px !important;
        }
        ::-webkit-scrollbar-track {
          background: #14141c !important;
        }
        ::-webkit-scrollbar-thumb {
          background: #3b82f6 !important;
          border-radius: 5px !important;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #2563eb !important;
        }
      `;
    } catch (err) {
      console.warn('Erro ao injetar estilos de rolagem no canvas:', err);
    }
  };

  // Carrega conteúdo de uma página específica no editor preservando comentários
  const loadPageContent = async (editor, slug) => {
    if (!editor) return;
    try {
      const data = await api.getPage(slug);

      const formattedHtml = formatHtml(data?.html || '');
      const formattedCss = formatCss(data?.css || '');

      // Armazena o código salvo no banco (com formatação e aninhamento garantidos)
      customCodeByPageRef.current[slug] = {
        html: formattedHtml,
        css: formattedCss
      };

      if (data && data.project_data) {
        try {
          const projectData = JSON.parse(data.project_data);
          editor.loadProjectData(projectData);
          if (data.css) {
            editor.setStyle(data.css);
          }
          setTimeout(() => injectCanvasStyles(editor), 150);
          return;
        } catch (e) {
          // fallback para html/css se json falhar
        }
      }

      if (data && data.html) {
        editor.setComponents(data.html);
        if (data.css) editor.setStyle(data.css);
      } else {
        editor.setComponents('');
        editor.setStyle('');
      }
      setTimeout(() => injectCanvasStyles(editor), 150);
    } catch (err) {
      console.warn(`Página ${slug} sem conteúdo prévio:`, err.message);
      customCodeByPageRef.current[slug] = { html: '', css: '' };
      editor.setComponents('');
      editor.setStyle('');
      setTimeout(() => injectCanvasStyles(editor), 150);
    }
  };

  // Carrega imagens já enviadas para o Asset Manager
  const loadExistingAssets = async (editor) => {
    if (!editor) return;
    try {
      const res = await api.getAssets();
      if (res && res.data && Array.isArray(res.data)) {
        editor.AssetManager.add(res.data);
      }
    } catch (err) {
      console.warn('Erro ao carregar galeria de fotos:', err.message);
    }
  };

  // Função auxiliar universal para copiar texto (compatível com HTTP e HTTPS)
  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {
      // prossegue para fallback seguro
    }
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    } catch (err) {
      return false;
    }
  };

  // Injeta o botão "Copiar Link" e intercepta o botão "X" de exclusão na galeria de fotos do GrapesJS
  const attachAssetInteractions = (editor) => {
    if (!editor) return;
    const assetElements = document.querySelectorAll('.gjs-am-asset');
    if (!assetElements.length) return;

    assetElements.forEach((el) => {
      // 1. Tenta extrair a URL da imagem da prévia
      let url = '';
      const preview = el.querySelector('.gjs-am-preview, .gjs-am-asset__preview, [class*="preview"], img');
      if (preview) {
        if (preview.tagName === 'IMG' && preview.src) {
          url = preview.src;
        } else if (preview.style && preview.style.backgroundImage) {
          url = preview.style.backgroundImage.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
        }
      }

      const meta = el.querySelector('.gjs-am-asset__meta, .gjs-am-meta, .gjs-am-name');
      const metaName = meta ? meta.textContent.trim() : '';

      // 2. Localiza o modelo no AssetManager para obter a URL e filename canônicos do servidor
      const allAssets = editor.AssetManager.getAll();
      const foundAsset = allAssets.find((a) => {
        const aSrc = a.get ? (a.get('src') || '') : (a.src || '');
        const aName = a.get ? (a.get('name') || '') : (a.name || '');
        const aFilename = a.get ? (a.get('filename') || '') : (a.filename || '');
        return (
          (url && aSrc === url) ||
          (metaName && (aName === metaName || aFilename === metaName || aSrc.endsWith('/' + metaName)))
        );
      });

      if (foundAsset) {
        const canonSrc = foundAsset.get ? foundAsset.get('src') : foundAsset.src;
        if (canonSrc) url = canonSrc;
      }

      // 3. Intercepta o botão "X" (.gjs-am-close) para confirmar antes de excluir do servidor
      const closeBtn = el.querySelector('.gjs-am-close, [data-toggle="asset-remove"]');
      if (closeBtn && !closeBtn.dataset.deleteIntercepted) {
        closeBtn.dataset.deleteIntercepted = 'true';
        closeBtn.title = 'Excluir imagem da pasta upload';

        closeBtn.addEventListener(
          'click',
          (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            let filename = '';
            if (url) {
              const cleanUrl = url.split('?')[0];
              filename = decodeURIComponent(cleanUrl.split('/').pop() || '');
            }
            if (!filename && metaName) {
              filename = metaName;
            }

            setDeleteConfirmModal({
              isOpen: true,
              filename: filename || metaName || 'imagem',
              src: url,
              assetEl: el
            });
          },
          true
        );
      }

      // 4. Injeta botão "Copiar Link" caso ainda não exista
      if (el.querySelector('.btn-copy-asset-url') || !url) return;

      const copyBtn = document.createElement('button');
      copyBtn.className = 'btn-copy-asset-url';
      copyBtn.type = 'button';
      copyBtn.title = 'Copiar link direto desta foto';
      copyBtn.innerHTML = `
        <svg style="width:12px;height:12px;flex-shrink:0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span>Copiar Link</span>
      `;

      copyBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const success = await copyToClipboard(url);
        if (success) {
          copyBtn.classList.add('copied');
          copyBtn.innerHTML = `
            <svg style="width:12px;height:12px;flex-shrink:0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Copiado!</span>
          `;
          showToast('success', `Link copiado: ${url}`, 'Link Copiado!', 3500);
          setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = `
              <svg style="width:12px;height:12px;flex-shrink:0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copiar Link</span>
            `;
          }, 2000);
        } else {
          window.prompt('Copie o link da foto abaixo:', url);
        }
      });

      el.appendChild(copyBtn);
    });
  };

  useEffect(() => {
    if (!containerRef.current) return;
    let editor = null;
    let assetsObserver = null;

    const setupEditor = async () => {
      setLoadingProgress(25);
      setLoadingStatusText('Carregando páginas e layout...');
      await loadPagesList();

      // 1. Consulta plugins ativos no SQLite
      let activePluginsList = [];
      const builtInMap = {
        'grapesjs-preset-webpage': gjsPresetWebpage,
        'grapesjs-blocks-basic': gjsBlocksBasic,
        'grapesjs-plugin-forms': gjsForms,
        'grapesjs-custom-code': gjsCustomCode,
        'grapesjs-style-bg': gjsStyleBg,
        'grapesjs-component-countdown': gjsCountdown,
        'grapesjs-tabs': gjsTabs,
        'grapesjs-tooltip': gjsTooltip,
        'grapesjs-plugin-ckeditor': gjsCkeditor
      };

      setLoadingProgress(50);
      setLoadingStatusText('Carregando biblioteca de plugins...');

      try {
        const pluginsRes = await api.getPlugins();
        const enabled = (pluginsRes.plugins || []).filter((p) => p.is_enabled === 1);
        
        for (const p of enabled) {
          if (builtInMap[p.package_name]) {
            activePluginsList.push(builtInMap[p.package_name]);
          } else if (p.cdn_url && p.cdn_url.trim()) {
            // Carregamento dinâmico de script CDN
            await new Promise((resolve) => {
              if (document.querySelector(`script[src="${p.cdn_url.trim()}"]`)) return resolve();
              const script = document.createElement('script');
              script.src = p.cdn_url.trim();
              script.async = true;
              script.onload = () => resolve();
              script.onerror = () => {
                console.warn(`Não foi possível carregar CDN: ${p.cdn_url}`);
                resolve();
              };
              document.head.appendChild(script);
            });
            activePluginsList.push(p.package_name);
          }
        }
      } catch (e) {
        activePluginsList = Object.values(builtInMap);
      }

      if (activePluginsList.length === 0) {
        activePluginsList.push(gjsPresetWebpage);
      }

      setLoadingProgress(75);
      setLoadingStatusText('Inicializando ferramentas e blocos...');

      // 2. Inicialização do GrapesJS Studio com os plugins ativos
      const token = getAuthToken();
      editor = grapesjs.init({
        container: containerRef.current,
        height: '100%',
        width: 'auto',
        storageManager: false,
        parser: {
          parserHtml: (str, config = {}) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(str, 'text/html');
            if (config.asDocument) return doc;
            const body = doc.body;
            const head = doc.head;

            // Move scripts para o final do body
            const scripts = head.querySelectorAll('script');
            scripts.forEach((node) => body.appendChild(node));

            const nodesToPrepend = [];
            const nodesToAppend = [];
            let passedHtml = false;

            if (doc.childNodes) {
              Array.from(doc.childNodes).forEach((node) => {
                if (node === doc.documentElement) {
                  passedHtml = true;
                } else if (node.nodeType === 8) {
                  if (!passedHtml) nodesToPrepend.push(node);
                  else nodesToAppend.push(node);
                }
              });
            }

            if (head && head.childNodes) {
              Array.from(head.childNodes).forEach((node) => {
                if (node.nodeType === 8 || (node.nodeType === 1 && node.tagName !== 'TITLE' && node.tagName !== 'SCRIPT')) {
                  nodesToPrepend.push(node);
                }
              });
            }

            for (let i = nodesToPrepend.length - 1; i >= 0; i--) {
              body.insertBefore(nodesToPrepend[i], body.firstChild);
            }
            nodesToAppend.forEach((node) => body.appendChild(node));

            return body;
          }
        },
        plugins: activePluginsList,
        pluginsOpts: {
          gjsPresetWebpage: {
            modalImportTitle: 'Importar Código HTML / CSS',
            modalImportButton: 'Carregar',
            modalImportLabel: '<div style="margin-bottom: 8px; font-size: 13px;">Cole ou edite seu HTML/CSS abaixo:</div>'
          },
          'grapesjs-blocks-basic': {
            flexGrid: true
          },
          'grapesjs-plugin-forms': {
            blocks: ['form', 'input', 'textarea', 'select', 'checkbox', 'radio', 'button', 'label']
          },
          'grapesjs-custom-code': {
            blockCustomCode: { label: 'Código Customizado (HTML/JS)' },
            modalTitle: 'Inserir Código Customizado'
          },
          'grapesjs-style-bg': {},
          'grapesjs-component-countdown': {
            blockCountdown: { label: 'Cronômetro Regressivo' }
          },
          'grapesjs-tabs': {},
          'grapesjs-tooltip': {},
          'grapesjs-plugin-ckeditor': {
            position: 'left',
            options: {
              language: 'pt-br',
              uiColor: '#242432',
              toolbar: [
                { name: 'basicstyles', items: ['Bold', 'Italic', 'Underline', 'Strike', '-', 'RemoveFormat'] },
                { name: 'paragraph', items: ['NumberedList', 'BulletedList', '-', 'Blockquote', '-', 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock'] },
                { name: 'links', items: ['Link', 'Unlink'] },
                { name: 'styles', items: ['Format', 'Font', 'FontSize'] },
                { name: 'colors', items: ['TextColor', 'BGColor'] }
              ]
            }
          }
        },
      assetManager: {
        upload: `${BASE_URL}/uploads`,
        uploadName: 'files',
        multiUpload: true,
        autoAdd: 1,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        modalTitle: 'Galeria de Imagens e Upload de Fotos',
        dropzoneContent: '<div style="text-align:center;padding:28px 15px;cursor:pointer;"><svg style="width:42px;height:42px;margin:0 auto 12px;color:#60a5fa;display:block;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><div style="font-weight:700;font-size:15px;color:#f3f4f6;margin-bottom:6px;">Arraste fotos aqui ou clique para selecionar</div><div style="font-size:12px;color:#9ca3af;">Formatos: PNG, JPG, JPEG, WEBP, GIF, SVG (máx. 15MB por foto)</div></div>',
        uploadFile: async (e) => {
          const files = e.dataTransfer ? e.dataTransfer.files : (e.target ? e.target.files : (e.files || e));
          if (!files || files.length === 0) return;

          const fileList = Array.from(files);
          
          for (const f of fileList) {
            if (f.size > 15 * 1024 * 1024) {
              showToast('error', `O arquivo "${f.name}" (${(f.size / (1024 * 1024)).toFixed(1)}MB) excede o limite máximo permitido de 15MB.`, 'Arquivo Muito Grande');
              return;
            }
          }

          showToast('loading', `Enviando ${fileList.length} imagem(ns) para o servidor...`, 'Fazendo Upload');

          try {
            const formData = new FormData();
            fileList.forEach((file) => {
              formData.append('files', file);
            });

            const currentToken = getAuthToken();
            const headers = {};
            if (currentToken) {
              headers['Authorization'] = `Bearer ${currentToken}`;
            }

            const response = await fetch(`${BASE_URL}/uploads`, {
              method: 'POST',
              headers,
              body: formData
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
              const errMsg = data.error || (response.status === 401 ? 'Sessão expirada. Faça login novamente no sistema.' : `Erro HTTP ${response.status} ao salvar foto.`);
              showToast('error', errMsg, 'Falha no Upload de Imagem');
              return;
            }

            const newAssets = data.assets || data.data || [];
            if (editor && editor.AssetManager) {
              editor.AssetManager.add(newAssets);
            }

            showToast('success', `${fileList.length} imagem(ns) adicionada(s) à galeria com sucesso!`, 'Upload Concluído');

            if (editor) {
              await loadExistingAssets(editor);
            }
          } catch (err) {
            console.error('Erro na requisição de upload:', err);
            showToast('error', `Erro de conexão com o servidor: ${err.message}. Verifique sua conexão ou se o backend está online.`, 'Erro de Conexão');
          }
        }
      },
      deviceManager: {
        devices: [
          { id: 'desktop', name: 'Desktop', width: '' },
          { id: 'tablet', name: 'Tablet', width: '768px', widthMedia: '768px' },
          { id: 'mobile', name: 'Mobile', width: '375px', widthMedia: '375px' }
        ]
      },
      canvas: {
        styles: [
          'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap'
        ],
        scripts: [
          '/bible-widget.js'
        ]
      }
    });

    // Adiciona trait de URL/Link direto da imagem no painel de propriedades (Engrenagem)
    editor.DomComponents.addType('image', {
      extend: 'image',
      model: {
        defaults: {
          traits: [
            {
              type: 'text',
              name: 'src',
              label: 'Endereço da Foto (URL / Link)',
              placeholder: 'Cole a URL: https://... ou /uploads/...',
              changeProp: 1
            },
            {
              type: 'text',
              name: 'alt',
              label: 'Texto Alternativo (Alt)',
              placeholder: 'Descrição da foto para acessibilidade'
            },
            {
              type: 'text',
              name: 'title',
              label: 'Título (Tooltip)',
              placeholder: 'Texto exibido ao passar o mouse'
            }
          ]
        },
        init() {
          this.listenTo(this, 'change:src', () => {
            const src = this.get('src');
            if (src && this.getAttributes().src !== src) {
              this.addAttributes({ src });
            }
          });
          this.listenTo(this, 'change:attributes:src', () => {
            const src = this.getAttributes().src;
            if (src && this.get('src') !== src) {
              this.set('src', src);
            }
          });
        }
      }
    });

    // Registra blocos customizados
    const blockManager = editor.BlockManager;

    // 1. Menu / Navbar
    blockManager.add('church-navbar', {
      label: `
        <div style="text-align: center;">
          <svg style="width:28px;height:28px;margin:0 auto 4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          <div style="font-size:11px;font-weight:600;">Menu / Navbar</div>
        </div>
      `,
      category: 'Estrutura & Menus',
      content: `
        <header style="background-color: #09090b; border-bottom: 1px solid #27272a; padding: 1.2rem 2rem; font-family: 'Inter', sans-serif;">
          <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <a href="/" style="color: #ffffff; text-decoration: none; font-size: 1.4rem; font-weight: 800; letter-spacing: -0.02em; display: flex; align-items: center; gap: 0.5rem;">
              <span style="background: #3b82f6; width: 10px; height: 10px; border-radius: 50%; display: inline-block;"></span>
              CHURCH
            </a>
            <nav style="display: flex; align-items: center; gap: 1.75rem; flex-wrap: wrap;">
              <a href="/" style="color: #ffffff; text-decoration: none; font-size: 0.95rem; font-weight: 500;">Home</a>
              <a href="/sobre" style="color: #a1a1aa; text-decoration: none; font-size: 0.95rem; font-weight: 500;">Sobre Nós</a>
              <a href="/cultos" style="color: #a1a1aa; text-decoration: none; font-size: 0.95rem; font-weight: 500;">Cultos & Horários</a>
              <a href="/contato" style="color: #a1a1aa; text-decoration: none; font-size: 0.95rem; font-weight: 500;">Contato</a>
            </nav>
            <a href="#aovivo" style="background-color: #ffffff; color: #09090b; padding: 0.55rem 1.25rem; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.9rem;">
              Assista Ao Vivo
            </a>
          </div>
        </header>
      `
    });

    // 2. Botão com Link
    blockManager.add('church-button', {
      label: `
        <div style="text-align: center;">
          <svg style="width:28px;height:28px;margin:0 auto 4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="18" height="10" rx="3"/><path d="M12 11h.01"/></svg>
          <div style="font-size:11px;font-weight:600;">Botão com Link</div>
        </div>
      `,
      category: 'Elementos Básicos',
      content: {
        type: 'link',
        content: 'Clique Aqui para Acessar',
        attributes: {
          href: 'https://google.com',
          target: '_blank'
        },
        style: {
          display: 'inline-block',
          'background-color': '#3b82f6',
          color: '#ffffff',
          padding: '12px 28px',
          'border-radius': '8px',
          'text-decoration': 'none',
          'font-weight': '600',
          'font-size': '16px',
          'font-family': 'Inter, sans-serif',
          'text-align': 'center'
        }
      }
    });

    // 3. Hero Banner
    blockManager.add('church-hero', {
      label: `
        <div style="text-align: center;">
          <svg style="width:28px;height:28px;margin:0 auto 4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <div style="font-size:11px;font-weight:600;">Hero Banner</div>
        </div>
      `,
      category: 'Seções Prontas',
      content: `
        <section style="padding: 5rem 2rem; background: linear-gradient(180deg, #09090b 0%, #18181b 100%); color: #ffffff; text-align: center; font-family: 'Inter', sans-serif;">
          <div style="max-width: 800px; margin: 0 auto;">
            <span style="display: inline-block; padding: 0.35rem 1rem; border-radius: 9999px; background-color: rgba(59, 130, 246, 0.15); color: #60a5fa; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; margin-bottom: 1.5rem;">
              Bem-vindo à Nossa Família
            </span>
            <h1 style="font-size: 3rem; font-weight: 800; line-height: 1.15; margin-bottom: 1.25rem;">
              Um lugar de fé, comunhão e transformação
            </h1>
            <p style="font-size: 1.2rem; color: #a1a1aa; line-height: 1.6; margin-bottom: 2.25rem;">
              Junte-se a nós em nossos cultos presenciais e online. Venha viver momentos inesquecíveis na presença de Deus.
            </p>
            <div style="display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap;">
              <a href="/cultos" style="background-color: #ffffff; color: #09090b; padding: 0.85rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Horários dos Cultos
              </a>
              <a href="#aovivo" style="background-color: #27272a; color: #ffffff; padding: 0.85rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Assistir Online
              </a>
            </div>
          </div>
        </section>
      `
    });

    // 4. Cards de Ministérios
    blockManager.add('church-cards-grid', {
      label: `
        <div style="text-align: center;">
          <svg style="width:28px;height:28px;margin:0 auto 4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          <div style="font-size:11px;font-weight:600;">Grade de Cards</div>
        </div>
      `,
      category: 'Seções Prontas',
      content: `
        <section style="padding: 4.5rem 2rem; background-color: #0c0c0e; font-family: 'Inter', sans-serif;">
          <div style="max-width: 1200px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 3.5rem;">
              <h2 style="font-size: 2.25rem; font-weight: 700; color: #ffffff; margin-bottom: 0.75rem;">Nossos Ministérios</h2>
              <p style="color: #a1a1aa; font-size: 1.1rem;">Descubra onde você e sua família podem se conectar</p>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem;">
              <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 2rem; display: flex; flex-direction: column;">
                <h3 style="color: #ffffff; font-size: 1.35rem; font-weight: 600; margin-bottom: 0.75rem;">Ministério Infantil</h3>
                <p style="color: #a1a1aa; line-height: 1.6; margin-bottom: 1.5rem; flex: 1;">Atividades lúdicas e bíblicas para crianças de todas as idades durante os cultos dominicais.</p>
                <a href="/infantil" style="color: #60a5fa; text-decoration: none; font-weight: 600;">Saiba Mais →</a>
              </div>
              <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 2rem; display: flex; flex-direction: column;">
                <h3 style="color: #ffffff; font-size: 1.35rem; font-weight: 600; margin-bottom: 0.75rem;">Jovens & Adolescentes</h3>
                <p style="color: #a1a1aa; line-height: 1.6; margin-bottom: 1.5rem; flex: 1;">Encontros semanais, louvor, dinâmicas e estudos focados nos desafios da juventude.</p>
                <a href="/jovens" style="color: #60a5fa; text-decoration: none; font-weight: 600;">Saiba Mais →</a>
              </div>
              <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 2rem; display: flex; flex-direction: column;">
                <h3 style="color: #ffffff; font-size: 1.35rem; font-weight: 600; margin-bottom: 0.75rem;">Grupos Familiares</h3>
                <p style="color: #a1a1aa; line-height: 1.6; margin-bottom: 1.5rem; flex: 1;">Reuniões nas casas para oração, comunhão fraterna e fortalecimento mútuo.</p>
                <a href="/grupos" style="color: #60a5fa; text-decoration: none; font-weight: 600;">Saiba Mais →</a>
              </div>
            </div>
          </div>
        </section>
      `
    });

    // 5. Horários
    blockManager.add('church-schedule', {
      label: `
        <div style="text-align: center;">
          <svg style="width:28px;height:28px;margin:0 auto 4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <div style="font-size:11px;font-weight:600;">Horários de Culto</div>
        </div>
      `,
      category: 'Seções Prontas',
      content: `
        <section id="cultos" style="padding: 4.5rem 2rem; background-color: #111114; color: #ffffff; font-family: 'Inter', sans-serif;">
          <div style="max-width: 900px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 3rem;">
              <h2 style="font-size: 2.25rem; font-weight: 700; margin-bottom: 0.5rem;">Horários das Celebrações</h2>
              <p style="color: #a1a1aa;">Estaremos de portas abertas para receber você e seus amigos</p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              <div style="background-color: #1a1a20; border: 1px solid #2e2e38; border-radius: 10px; padding: 1.5rem 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div>
                  <h4 style="font-size: 1.2rem; font-weight: 600;">Culto de Celebração Dominical</h4>
                  <p style="color: #a1a1aa; font-size: 0.9rem; margin-top: 0.25rem;">Culto principal com louvor e pregação da Palavra</p>
                </div>
                <div style="background-color: #272732; padding: 0.5rem 1.25rem; border-radius: 8px; font-weight: 700; color: #60a5fa; font-size: 1.1rem;">
                  Domingo • 10h e 19h
                </div>
              </div>
              <div style="background-color: #1a1a20; border: 1px solid #2e2e38; border-radius: 10px; padding: 1.5rem 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div>
                  <h4 style="font-size: 1.2rem; font-weight: 600;">Culto de Oração & Estudo Bíblico</h4>
                  <p style="color: #a1a1aa; font-size: 0.9rem; margin-top: 0.25rem;">Momento de intercessão e aprofundamento bíblico</p>
                </div>
                <div style="background-color: #272732; padding: 0.5rem 1.25rem; border-radius: 8px; font-weight: 700; color: #34d399; font-size: 1.1rem;">
                  Quarta-feira • 19h30
                </div>
              </div>
            </div>
          </div>
        </section>
      `
    });

    // 6. Carrossel / Slider de Fotos
    blockManager.add('church-photo-carousel', {
      label: `
        <div style="text-align: center;">
          <svg style="width:28px;height:28px;margin:0 auto 4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
          <div style="font-size:11px;font-weight:600;">Carrossel de Fotos</div>
        </div>
      `,
      category: 'Mídia & Dinâmico',
      content: `
        <section class="church-carousel-section" style="padding: 3.5rem 1.5rem; background-color: #0c0c0e; font-family: 'Inter', sans-serif;">
          <div style="max-width: 1100px; margin: 0 auto; text-align: center;">
            <h2 style="color: #ffffff; font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">Galeria de Momentos & Eventos</h2>
            <p style="color: #a1a1aa; font-size: 1.05rem; margin-bottom: 2rem;">Confira os registros das nossas celebrações e atividades</p>
            
            <div style="display: flex; gap: 1.5rem; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 1.25rem; scrollbar-width: thin;">
              <div style="flex: 0 0 320px; scroll-snap-align: start; background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; text-align: left;">
                <img src="https://images.unsplash.com/photo-1519817650390-64a93db51149?w=600&auto=format&fit=crop&q=80" alt="Culto de Domingo" style="width: 100%; height: 220px; object-fit: cover; display: block;" />
                <div style="padding: 1.25rem;">
                  <h3 style="color: #ffffff; font-size: 1.15rem; font-weight: 600; margin-bottom: 0.35rem;">Culto de Celebração</h3>
                  <p style="color: #a1a1aa; font-size: 0.88rem; line-height: 1.5;">Domingo às 10h e 19h com louvor, ministração e comunhão.</p>
                </div>
              </div>

              <div style="flex: 0 0 320px; scroll-snap-align: start; background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; text-align: left;">
                <img src="https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=600&auto=format&fit=crop&q=80" alt="Conferência" style="width: 100%; height: 220px; object-fit: cover; display: block;" />
                <div style="padding: 1.25rem;">
                  <h3 style="color: #ffffff; font-size: 1.15rem; font-weight: 600; margin-bottom: 0.35rem;">Conferência de Jovens</h3>
                  <p style="color: #a1a1aa; font-size: 0.88rem; line-height: 1.5;">Encontro especial com ministração, palestras e dinâmicas.</p>
                </div>
              </div>

              <div style="flex: 0 0 320px; scroll-snap-align: start; background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; text-align: left;">
                <img src="https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600&auto=format&fit=crop&q=80" alt="Ação Social" style="width: 100%; height: 220px; object-fit: cover; display: block;" />
                <div style="padding: 1.25rem;">
                  <h3 style="color: #ffffff; font-size: 1.15rem; font-weight: 600; margin-bottom: 0.35rem;">Ação Social Comunitária</h3>
                  <p style="color: #a1a1aa; font-size: 0.88rem; line-height: 1.5;">Entrega de cestas básicas e apoio às famílias da nossa região.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      `
    });

    // 7. Bíblia Sagrada Interativa (NVI, ACF, AA)
    blockManager.add('church-bible', {
      label: `
        <div style="text-align: center;">
          <svg style="width:28px;height:28px;margin:0 auto 4px;color:#3b82f6;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 1 3-3h7z"/>
            <path d="M6 8h2M6 12h2M16 8h2M16 12h2"/>
          </svg>
          <div style="font-size:11px;font-weight:600;">Bíblia Sagrada</div>
        </div>
      `,
      category: 'Mídia & Dinâmico',
      content: `
        <div class="church-bible-container" style="width: 100%; min-height: 520px; display: block; background-color: transparent; margin: 0; padding: 0;">
          <div id="church-bible-app" class="church-bible-widget" style="width: 100%; min-height: 520px; margin: 0;"></div>
        </div>
      `
    });

    // 8. Rodapé
    blockManager.add('church-footer', {
      label: `
        <div style="text-align: center;">
          <svg style="width:28px;height:28px;margin:0 auto 4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <div style="font-size:11px;font-weight:600;">Rodapé Completo</div>
        </div>
      `,
      category: 'Estrutura & Menus',
      content: `
        <footer style="background-color: #09090b; border-top: 1px solid #27272a; padding: 3rem 2rem 2rem; color: #a1a1aa; font-family: 'Inter', sans-serif;">
          <div style="max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 2rem;">
            <div style="max-width: 320px;">
              <h3 style="color: #ffffff; font-size: 1.3rem; font-weight: 800; margin-bottom: 0.75rem;">CHURCH</h3>
              <p style="font-size: 0.9rem; line-height: 1.6;">Levando esperança, fé e amor para toda a comunidade.</p>
            </div>
            <div>
              <h4 style="color: #ffffff; font-size: 0.95rem; font-weight: 600; text-transform: uppercase; margin-bottom: 0.75rem;">Endereço</h4>
              <p style="font-size: 0.9rem; line-height: 1.6;">Av. Principal, 1000 - Centro<br />São Paulo - SP</p>
            </div>
            <div>
              <h4 style="color: #ffffff; font-size: 0.95rem; font-weight: 600; text-transform: uppercase; margin-bottom: 0.75rem;">Contato</h4>
              <p style="font-size: 0.9rem; line-height: 1.6;">contato@church.org<br />(11) 99999-9999</p>
            </div>
          </div>
          <div style="max-width: 1200px; margin: 2rem auto 0; padding-top: 1.5rem; border-top: 1px solid #1f1f23; text-align: center; font-size: 0.82rem;">
            © ${new Date().getFullYear()} Church. Todos os direitos reservados.
          </div>
        </footer>
      `
    });

    // Garante que TODOS os dispositivos (inclusive os nativos da barra esquerda) tenham larguras físicas configuradas
    const dm = editor.Devices;
    dm.getAll().forEach((device) => {
      const id = (device.get('id') || device.id || '').toLowerCase();
      const name = (device.get('name') || device.name || '').toLowerCase();
      
      if (id.includes('mobile') || id.includes('portrait') || id.includes('phone') || name.includes('mobile')) {
        device.set({ width: '375px', widthMedia: '375px' });
      } else if (id.includes('tablet') || name.includes('tablet')) {
        device.set({ width: '768px', widthMedia: '768px' });
      } else if (id.includes('desktop') || name.includes('desktop')) {
        device.set({ width: '', widthMedia: '' });
      }
    });

    const existingDevices = dm.getAll();
    if (!existingDevices.find(d => (d.get('id') || '').toLowerCase() === 'desktop')) {
      dm.add({ id: 'desktop', name: 'Desktop', width: '' });
    }
    if (!existingDevices.find(d => (d.get('id') || '').toLowerCase() === 'tablet')) {
      dm.add({ id: 'tablet', name: 'Tablet', width: '768px', widthMedia: '768px' });
    }
    if (!existingDevices.find(d => (d.get('id') || '').toLowerCase() === 'mobile')) {
      dm.add({ id: 'mobile', name: 'Mobile', width: '375px', widthMedia: '375px' });
    }

    // Sobrescreve os comandos dos botões nativos da esquerda para garantir 375px no celular e 768px no tablet
    editor.Commands.add('set-device-mobile', {
      run(ed) {
        const target = ed.Devices.getAll().find(d => (d.get('id') || '').toLowerCase().includes('mobile') || (d.get('id') || '').toLowerCase().includes('portrait'));
        ed.setDevice(target ? target.get('id') : 'mobile');
      }
    });
    editor.Commands.add('set-device-tablet', {
      run(ed) {
        const target = ed.Devices.getAll().find(d => (d.get('id') || '').toLowerCase().includes('tablet'));
        ed.setDevice(target ? target.get('id') : 'tablet');
      }
    });
    editor.Commands.add('set-device-desktop', {
      run(ed) {
        const target = ed.Devices.getAll().find(d => (d.get('id') || '').toLowerCase().includes('desktop'));
        ed.setDevice(target ? target.get('id') : 'desktop');
      }
    });

    // Habilita edição direta por duplo clique em elementos de Link (itens de menu, botões, etc.)
    editor.DomComponents.addType('link', {
      isComponent: el => el.tagName === 'A',
      model: {
        defaults: {
          editable: true,
          droppable: true
        }
      }
    });

    // Comando 'export-template' abre o Modal Nativo em React com CodeMirror e Syntax Highlighting oficial
    editor.Commands.add('export-template', {
      run() {
        setIsCodeModalOpen(true);
      }
    });

    // Garante remoção de classes ao fechar qualquer modal
    editor.on('modal:close', () => {
      document.querySelectorAll('.gjs-mdl-dialog-code-full').forEach(el => el.classList.remove('gjs-mdl-dialog-code-full'));
      document.querySelectorAll('.gjs-mdl-container-code-full').forEach(el => el.classList.remove('gjs-mdl-container-code-full'));
    });

    // Sincroniza alterações no canvas com o cache de código da página preservando aninhamento e comentários
    editor.on('component:update component:add component:remove', () => {
      const page = currentPageRef.current;
      if (customCodeByPageRef.current[page]) {
        customCodeByPageRef.current[page].html = formatHtml(editor.getHtml() || '');
      }
    });

    editor.on('style:update style:custom', () => {
      const page = currentPageRef.current;
      // Preserva o CSS com comentários já existente; se não houver, inicializa
      if (!customCodeByPageRef.current[page] || !customCodeByPageRef.current[page].css) {
        if (!customCodeByPageRef.current[page]) customCodeByPageRef.current[page] = {};
        customCodeByPageRef.current[page].css = formatCss(editor.getCss() || '');
      }
    });

    // Escuta mudança de dispositivo no GrapesJS para sincronizar os botões da barra superior
    editor.on('change:device', () => {
      const currentDevice = editor.getDevice();
      if (!currentDevice) return;
      const idOrName = (typeof currentDevice === 'string' ? currentDevice : currentDevice.get ? (currentDevice.get('id') || currentDevice.get('name')) : currentDevice.id || '').toLowerCase();
      if (idOrName.includes('mobile') || idOrName.includes('phone') || idOrName.includes('portrait')) {
        setActiveDevice('mobile');
      } else if (idOrName.includes('tablet')) {
        setActiveDevice('tablet');
      } else {
        setActiveDevice('desktop');
      }
      setTimeout(() => injectCanvasStyles(editor), 100);
    });

    // Injeta estilos de rolagem ao carregar o canvas/iframe
    editor.on('load', () => {
      injectCanvasStyles(editor);
    });
    editor.on('canvas:frame:load', () => {
      injectCanvasStyles(editor);
    });

    // Escuta modo Preview para alternar para o botão de Lápis
    editor.on('run:preview', () => setIsPreviewActive(true));
    editor.on('stop:preview', () => setIsPreviewActive(false));
    editor.on('run:core:preview', () => setIsPreviewActive(true));
    editor.on('stop:core:preview', () => setIsPreviewActive(false));

    // Escuta erros de upload e eventos da galeria de fotos
    editor.on('asset:upload:error', (err) => {
      const msg = typeof err === 'string' ? err : (err?.message || JSON.stringify(err));
      showToast('error', `Erro na galeria: ${msg}`, 'Erro de Upload');
    });

    // Recarrega galeria de fotos sempre que abrir a galeria no editor e injeta botões e interações
    editor.on('run:open-assets', async () => {
      await loadExistingAssets(editor);
      setTimeout(() => attachAssetInteractions(editor), 100);
      setTimeout(() => attachAssetInteractions(editor), 300);
    });

    // Observer contínuo para detectar modal da galeria e anexar botões e eventos
    assetsObserver = new MutationObserver(() => {
      attachAssetInteractions(editor);
    });
    assetsObserver.observe(document.body, { childList: true, subtree: true });

    // Executa carregamento inicial
    await loadPagesList();
    await loadPageContent(editor, 'home');
    await loadExistingAssets(editor);

    setEditorInstance(editor);
    editorRef.current = editor;

    setTimeout(() => injectCanvasStyles(editor), 250);

    setLoadingProgress(100);
    setLoadingStatusText('✔ Pronto para editar!');
    setTimeout(() => {
      setEditorLoading(false);
    }, 350);
  };

  setupEditor();

  return () => {
    if (assetsObserver) {
      assetsObserver.disconnect();
    }
    if (editor) {
      editor.destroy();
    }
  };
}, []);

  // Atalho do Teclado ESC para sair do modo Preview
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isPreviewActive && editorRef.current) {
        editorRef.current.Commands.stop('preview');
        editorRef.current.Commands.stop('core:preview');
        setIsPreviewActive(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreviewActive]);

  // Função para sair do preview e voltar para edição
  const handleExitPreview = () => {
    if (!editorRef.current) return;
    editorRef.current.Commands.stop('preview');
    editorRef.current.Commands.stop('core:preview');
    setIsPreviewActive(false);
  };

  // Alternar entre páginas no editor
  const handleSelectPage = async (newSlug) => {
    if (newSlug === currentPage) return;
    if (!editorRef.current) return;

    // Salva automaticamente a página atual antes de alternar sincronizando canvas e estilos formatados
    try {
      const gjsHtml = editorRef.current.getHtml() || '';
      const formattedHtml = formatHtml(gjsHtml);

      const savedCss = customCodeByPageRef.current[currentPage]?.css;
      const formattedCss = (savedCss !== undefined && savedCss !== null && savedCss.trim() !== '')
        ? formatCss(savedCss)
        : formatCss(editorRef.current.getCss() || '');

      customCodeByPageRef.current[currentPage] = {
        html: formattedHtml,
        css: formattedCss
      };

      const projectData = editorRef.current.getProjectData();
      const pageInfo = pages.find((p) => p.slug === currentPage);
      await api.savePage(currentPage, {
        title: pageInfo?.title || currentPage,
        html: formattedHtml,
        css: formattedCss,
        project_data: JSON.stringify(projectData)
      });
    } catch (e) {
      console.warn('Auto-save ao trocar de página:', e);
    }

    setCurrentPage(newSlug);
    loadPageContent(editorRef.current, newSlug);
  };

  // Criar nova página
  const handleCreateNewPage = async (e) => {
    e.preventDefault();
    if (!newPageData.title.trim() || !newPageData.slug.trim()) return;

    try {
      const res = await api.createPage(newPageData);
      setIsNewPageModalOpen(false);
      setNewPageData({ title: '', slug: '' });
      await loadPagesList();

      if (res && res.page) {
        handleSelectPage(res.page.slug);
      }
      alert('Nova página criada com sucesso!');
    } catch (err) {
      alert(err.message || 'Erro ao criar página.');
    }
  };

  // Excluir página
  const handleDeleteCurrentPage = async () => {
    if (currentPage === 'home') {
      alert('A página principal (Home) não pode ser excluída.');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja excluir a página "${currentPage}"?`)) return;

    try {
      await api.deletePage(currentPage);
      await loadPagesList();
      handleSelectPage('home');
      alert('Página excluída com sucesso.');
    } catch (err) {
      alert(err.message || 'Erro ao excluir página.');
    }
  };

  // Salvar a página ativa no SQLite sincronizando 100% os estilos do canvas e elementos formatados
  const handleSave = async () => {
    if (!editorRef.current) return;
    setSaving(true);
    setSaveStatus(null);

    try {
      const gjsHtml = editorRef.current.getHtml() || '';
      const formattedHtml = formatHtml(gjsHtml);

      const savedCss = customCodeByPageRef.current[currentPage]?.css;
      const formattedCss = (savedCss !== undefined && savedCss !== null && savedCss.trim() !== '')
        ? formatCss(savedCss)
        : formatCss(editorRef.current.getCss() || '');

      // Sincroniza a memória local com as alterações visuais e estilos formatados e aninhados
      customCodeByPageRef.current[currentPage] = {
        html: formattedHtml,
        css: formattedCss
      };

      const projectData = editorRef.current.getProjectData();
      const pageInfo = pages.find((p) => p.slug === currentPage);

      await api.savePage(currentPage, {
        title: pageInfo?.title || currentPage,
        html: formattedHtml,
        css: formattedCss,
        project_data: JSON.stringify(projectData)
      });

      setSaveStatus({
        type: 'success',
        message: `Página "${currentPage}" salva com sucesso no banco de dados!`
      });

      setTimeout(() => {
        setSaveStatus(null);
      }, 4000);
    } catch (err) {
      setSaveStatus({
        type: 'error',
        message: err.message || 'Erro ao salvar página.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeviceChange = (deviceType) => {
    if (!editorRef.current) return;
    const dm = editorRef.current.Devices;
    const all = dm.getAll();
    
    // Procura o dispositivo correto pelo ID ou nome
    let target = all.find(d => {
      const id = (d.get('id') || d.id || '').toLowerCase();
      const name = (d.get('name') || d.name || '').toLowerCase();
      if (deviceType === 'desktop') return id.includes('desktop') || name.includes('desktop');
      if (deviceType === 'tablet') return id.includes('tablet') || name.includes('tablet');
      if (deviceType === 'mobile') return id.includes('mobile') || name.includes('mobile') || id.includes('phone') || id.includes('portrait');
      return false;
    });

    if (!target && deviceType === 'mobile') {
      target = dm.add({ id: 'mobile', name: 'Mobile', width: '375px', widthMedia: '375px' });
    }

    if (target) {
      const targetId = target.get ? target.get('id') : target.id;
      editorRef.current.setDevice(targetId);
    } else {
      editorRef.current.setDevice(deviceType);
    }
    setActiveDevice(deviceType);
    setTimeout(() => injectCanvasStyles(editorRef.current), 100);
  };

  const handleOpenAssetManager = async () => {
    if (!editorRef.current) return;
    await loadExistingAssets(editorRef.current);
    editorRef.current.runCommand('open-assets');
  };

  const handleUndo = () => {
    if (!editorRef.current) return;
    editorRef.current.runCommand('core:undo');
  };

  const handleRedo = () => {
    if (!editorRef.current) return;
    editorRef.current.runCommand('core:redo');
  };

  const handleClear = () => {
    if (!editorRef.current) return;
    if (window.confirm('Deseja realmente limpar todos os elementos desta página?')) {
      editorRef.current.setComponents('');
      editorRef.current.setStyle('');
    }
  };

  const handleViewCode = () => {
    setIsCodeModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 68px)', backgroundColor: '#18181f' }}>
      {/* Barra de Ferramentas Superior com Múltiplas Páginas, Uploads e Controles */}
      <div style={{
        height: '54px',
        backgroundColor: '#121217',
        borderBottom: '1px solid #282833',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.25rem',
        zIndex: 10,
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Seletor de Páginas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#1c1c24', padding: '4px 8px', borderRadius: '8px', border: '1px solid #2e2e3e' }}>
            <FileText size={15} color="#60a5fa" />
            <span style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: 500 }}>Página:</span>
            <select
              value={currentPage}
              onChange={(e) => handleSelectPage(e.target.value)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {pages.map((p) => (
                <option key={p.slug} value={p.slug} style={{ backgroundColor: '#181820', color: '#ffffff' }}>
                  {p.title} (/{p.slug === 'home' ? '' : p.slug})
                </option>
              ))}
            </select>
          </div>

          {/* Botão para Nova Página */}
          <button
            id="btn-new-page"
            onClick={() => setIsNewPageModalOpen(true)}
            className="btn-secondary"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
            title="Criar nova página (ex: /sobre, /cultos)"
          >
            <Plus size={13} />
            <span>Nova Página</span>
          </button>

          {/* Botão de Excluir Página Secundária */}
          {currentPage !== 'home' && (
            <button
              onClick={handleDeleteCurrentPage}
              className="btn-secondary"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', color: '#f87171' }}
              title="Excluir esta página"
            >
              <Trash2 size={13} />
            </button>
          )}

          <div style={{ width: '1px', height: '20px', backgroundColor: '#282833' }} />

          {/* Alternador de Dispositivos */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', backgroundColor: '#1c1c24', padding: '3px', borderRadius: '6px' }}>
            <button
              onClick={() => handleDeviceChange('desktop')}
              style={{
                background: activeDevice === 'desktop' ? '#333342' : 'transparent',
                color: activeDevice === 'desktop' ? '#ffffff' : '#9ca3af',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem'
              }}
              title="Desktop (100%)"
            >
              <Monitor size={14} />
              <span>Desktop</span>
            </button>
            <button
              onClick={() => handleDeviceChange('tablet')}
              style={{
                background: activeDevice === 'tablet' ? '#333342' : 'transparent',
                color: activeDevice === 'tablet' ? '#ffffff' : '#9ca3af',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem'
              }}
              title="Tablet (768px)"
            >
              <Tablet size={14} />
              <span>Tablet</span>
            </button>
            <button
              onClick={() => handleDeviceChange('mobile')}
              style={{
                background: activeDevice === 'mobile' ? '#333342' : 'transparent',
                color: activeDevice === 'mobile' ? '#ffffff' : '#9ca3af',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem'
              }}
              title="Mobile (375px)"
            >
              <Smartphone size={14} />
              <span>Mobile</span>
            </button>
          </div>

          {/* Botão para Abrir Galeria / Upload de Fotos */}
          <button
            id="btn-open-assets"
            onClick={handleOpenAssetManager}
            className="btn-secondary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
            title="Abrir gerenciador de fotos e fazer upload"
          >
            <ImageIcon size={14} color="#34d399" />
            <span>Galeria / Upload</span>
          </button>
        </div>

        {/* Feedback de Salvamento */}
        {saveStatus && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.82rem',
            color: saveStatus.type === 'success' ? '#34d399' : '#f87171'
          }}>
            {saveStatus.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span>{saveStatus.message}</span>
          </div>
        )}

        {/* Ações do Editor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={handleUndo} className="btn-secondary" style={{ padding: '0.35rem 0.6rem' }} title="Desfazer (Ctrl+Z)">
            <Undo2 size={14} />
          </button>
          <button onClick={handleRedo} className="btn-secondary" style={{ padding: '0.35rem 0.6rem' }} title="Refazer (Ctrl+Y)">
            <Redo2 size={14} />
          </button>
          <button onClick={handleViewCode} className="btn-secondary" style={{ padding: '0.35rem 0.6rem' }} title="Ver Código">
            <Code2 size={14} />
          </button>
          <button onClick={handleClear} className="btn-secondary" style={{ padding: '0.35rem 0.6rem', color: '#f87171' }} title="Limpar página">
            <Trash2 size={14} />
          </button>

          <button
            id="btn-save-grapes"
            onClick={handleSave}
            disabled={saving}
            className="btn-accent"
            style={{
              padding: '0.45rem 1.15rem',
              fontSize: '0.85rem',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 600
            }}
          >
            <Save size={15} />
            <span>{saving ? 'Salvando...' : `Salvar (${currentPage})`}</span>
          </button>
        </div>
      </div>

      {/* Canvas do GrapesJS */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        {editorLoading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#121217',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem'
          }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              border: '3px solid #272736',
              borderTopColor: '#3b82f6',
              animation: 'spin 1s linear infinite'
            }} />
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
              {loadingStatusText}
            </div>
            <div style={{
              width: '280px',
              height: '8px',
              backgroundColor: '#272736',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${loadingProgress}%`,
                height: '100%',
                backgroundColor: '#3b82f6',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600 }}>
              {loadingProgress}% concluído
            </span>
          </div>
        )}
        {/* Botão de Lápis que surge no local exato do Olho durante o Preview */}
        {isPreviewActive && (
          <button
            id="btn-exit-preview"
            onClick={handleExitPreview}
            style={{
              position: 'absolute',
              top: '6px',
              right: '185px',
              zIndex: 999999,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              height: '32px',
              padding: '0 12px',
              borderRadius: '6px',
              backgroundColor: '#181822',
              border: '1px solid #3b82f6',
              color: '#60a5fa',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.8)',
              transition: 'all 0.2s ease',
              animation: 'fadeIn 0.2s ease-out'
            }}
            title="Voltar para Edição (ou pressione ESC)"
          >
            <Pencil size={15} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Editar</span>
          </button>
        )}

        <div ref={containerRef} id="gjs" style={{ height: '100%', width: '100%' }} />
      </div>

      {/* Modal Criar Nova Página */}
      {isNewPageModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNewPageModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Criar Nova Página</h2>
              <button className="close-btn" onClick={() => setIsNewPageModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateNewPage} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Título da Página</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Sobre Nós"
                  value={newPageData.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    const autoSlug = title
                      .toLowerCase()
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                      .replace(/[^a-z0-9]/g, '-');
                    setNewPageData({ title, slug: autoSlug });
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Slug da URL (endereço da página)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>localhost:5173/</span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="sobre-nos"
                    value={newPageData.slug}
                    onChange={(e) => setNewPageData({ ...newPageData, slug: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsNewPageModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-accent">
                  Criar Página
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Popup de Confirmação para Excluir Imagem da Pasta Uploads */}
      {deleteConfirmModal.isOpen && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999
          }}
          onClick={handleCancelDelete}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#161622',
              border: '1px solid #2e2e42',
              borderRadius: '12px',
              padding: '1.75rem',
              maxWidth: '440px',
              width: '90vw',
              textAlign: 'center',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            {/* Ícone de Lixeira / Alerta */}
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                border: '1px solid rgba(239, 68, 68, 0.25)'
              }}
            >
              <Trash2 size={26} />
            </div>

            {/* Pergunta exata solicitada pelo usuário */}
            <h3
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#f8fafc',
                marginBottom: '0.5rem',
                lineHeight: 1.3
              }}
            >
              Tem certeza que quer excluir essa imagem?
            </h3>

            <p
              style={{
                fontSize: '0.85rem',
                color: '#94a3b8',
                marginBottom: '1.25rem',
                lineHeight: 1.4
              }}
            >
              Esta foto será excluída permanentemente da pasta <code>upload</code> do servidor.
            </p>

            {/* Prévia e Nome do arquivo */}
            {deleteConfirmModal.src && (
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  backgroundColor: '#0c0c12',
                  borderRadius: '8px',
                  border: '1px solid #28283a',
                  marginBottom: '1.5rem',
                  boxSizing: 'border-box',
                  textAlign: 'left'
                }}
              >
                <img
                  src={deleteConfirmModal.src}
                  alt={deleteConfirmModal.filename}
                  style={{
                    width: '48px',
                    height: '48px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    border: '1px solid #333348',
                    backgroundColor: '#000000',
                    flexShrink: 0
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#e2e8f0',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    title={deleteConfirmModal.filename}
                  >
                    {deleteConfirmModal.filename}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    Pasta: upload
                  </div>
                </div>
              </div>
            )}

            {/* Botões: Não e Sim */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                width: '100%',
                justifyContent: 'center'
              }}
            >
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCancelDelete}
                disabled={isDeletingAsset}
                style={{
                  flex: 1,
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  cursor: isDeletingAsset ? 'not-allowed' : 'pointer',
                  backgroundColor: '#222230',
                  color: '#e2e8f0',
                  border: '1px solid #38384e',
                  transition: 'all 0.15s ease'
                }}
              >
                Não
              </button>

              <button
                type="button"
                className="btn-danger"
                onClick={handleConfirmDelete}
                disabled={isDeletingAsset}
                style={{
                  flex: 1,
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  cursor: isDeletingAsset ? 'not-allowed' : 'pointer',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                  transition: 'all 0.15s ease',
                  opacity: isDeletingAsset ? 0.7 : 1
                }}
              >
                {isDeletingAsset ? (
                  <span>Excluindo...</span>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Sim</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nativo React de Edição de Código Livre (HTML & CSS) */}
      {isCodeModalOpen && (
        <div className="church-custom-code-modal-overlay">
          <div className="church-custom-code-modal">
            {/* Barra Superior Mínima com Botão Fechar */}
            <div className="church-custom-code-header">
              <button
                type="button"
                className="church-custom-code-close-btn"
                onClick={() => setIsCodeModalOpen(false)}
                title="Fechar (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Corpo com Colunas HTML e CSS lado a lado */}
            <div className="church-custom-code-body">
              {/* Coluna HTML (Esquerda) */}
              <div className="church-code-col">
                <div className="church-editor-top-bar">
                  <div className="church-code-tag tag-html">HTML</div>
                  <div className="church-editor-search-box">
                    <span className="church-editor-search-icon">
                      <Search size={13} />
                    </span>
                    <input
                      ref={htmlSearchInputRef}
                      type="text"
                      className="church-code-inline-search"
                      placeholder="Buscar no HTML (Enter)..."
                      value={htmlSearchQuery}
                      onChange={(e) => {
                        setHtmlSearchQuery(e.target.value);
                        performSearch('html', e.target.value);
                      }}
                      onKeyDown={(e) => handleSearchKeyDown('html', e)}
                      spellCheck={false}
                    />
                    {htmlMatchInfo.total > 0 && (
                      <span className="church-search-match-count">
                        {htmlMatchInfo.current}/{htmlMatchInfo.total}
                      </span>
                    )}
                    {htmlSearchQuery.trim() && htmlMatchInfo.total === 0 && (
                      <span className="church-search-match-count is-empty">
                        0/0
                      </span>
                    )}
                  </div>
                </div>
                <div className="church-editor-code-wrapper" ref={htmlHostRef} />
              </div>

              {/* Coluna CSS (Direita) */}
              <div className="church-code-col">
                <div className="church-editor-top-bar">
                  <div className="church-code-tag tag-css">CSS</div>
                  <div className="church-editor-search-box">
                    <span className="church-editor-search-icon">
                      <Search size={13} />
                    </span>
                    <input
                      ref={cssSearchInputRef}
                      type="text"
                      className="church-code-inline-search"
                      placeholder="Buscar no CSS (Enter)..."
                      value={cssSearchQuery}
                      onChange={(e) => {
                        setCssSearchQuery(e.target.value);
                        performSearch('css', e.target.value);
                      }}
                      onKeyDown={(e) => handleSearchKeyDown('css', e)}
                      spellCheck={false}
                    />
                    {cssMatchInfo.total > 0 && (
                      <span className="church-search-match-count">
                        {cssMatchInfo.current}/{cssMatchInfo.total}
                      </span>
                    )}
                    {cssSearchQuery.trim() && cssMatchInfo.total === 0 && (
                      <span className="church-search-match-count is-empty">
                        0/0
                      </span>
                    )}
                  </div>
                </div>
                <div className="church-editor-code-wrapper" ref={cssHostRef} />
              </div>
            </div>

            {/* Rodapé Fixo com Aviso e Botões Cancelar e Salvar Código */}
            <div className="church-custom-code-footer">
              <span className="church-custom-code-hint">
                💡 Digite nos campos acima e aperte <strong>Enter</strong> para localizar no código (ou <strong>Shift+Enter</strong> para anterior).
              </span>
              <div className="church-custom-code-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsCodeModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-save-code"
                  onClick={handleSaveCodeModal}
                  disabled={isSavingCodeModal}
                >
                  <Save size={15} />
                  <span>{isSavingCodeModal ? 'Salvando...' : 'Salvar Código'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pop-up Flutuante de Notificação / Erro / Sucesso com Alta Visibilidade */}
      {toastNotification && (
        <div
          id="toast-notification-popup"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 99999999,
            maxWidth: '440px',
            minWidth: '320px',
            backgroundColor:
              toastNotification.type === 'error'
                ? '#241013'
                : toastNotification.type === 'success'
                ? '#0d2818'
                : '#131b2e',
            border: `1px solid ${
              toastNotification.type === 'error'
                ? '#ef4444'
                : toastNotification.type === 'success'
                ? '#10b981'
                : '#3b82f6'
            }`,
            borderRadius: '10px',
            padding: '14px 16px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            animation: 'fadeIn 0.25s ease-out'
          }}
        >
          <div style={{ marginTop: '2px', flexShrink: 0 }}>
            {toastNotification.type === 'error' && <AlertCircle size={22} color="#ef4444" />}
            {toastNotification.type === 'success' && <CheckCircle2 size={22} color="#10b981" />}
            {toastNotification.type === 'loading' && (
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: '2px solid #3b82f6',
                  borderTopColor: 'transparent',
                  animation: 'spin 0.8s linear infinite'
                }}
              />
            )}
            {toastNotification.type === 'info' && <AlertCircle size={22} color="#60a5fa" />}
          </div>

          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color:
                  toastNotification.type === 'error'
                    ? '#fca5a5'
                    : toastNotification.type === 'success'
                    ? '#86efac'
                    : '#93c5fd',
                marginBottom: '4px'
              }}
            >
              {toastNotification.title}
            </div>
            <div
              style={{
                fontSize: '0.82rem',
                color: '#e2e8f0',
                lineHeight: 1.4,
                wordBreak: 'break-word'
              }}
            >
              {toastNotification.message}
            </div>
          </div>

          <button
            onClick={() => setToastNotification(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px'
            }}
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};
