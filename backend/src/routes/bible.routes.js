const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const BIBLE_DIR = path.resolve(__dirname, '../data/bible');

// Cache em memória para acesso instantâneo
const versionsCache = {};

const loadBibleVersion = (version = 'nvi') => {
  const v = version.toLowerCase();
  if (versionsCache[v]) return versionsCache[v];

  const filePath = path.join(BIBLE_DIR, `${v}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    versionsCache[v] = data;
    return data;
  } catch (err) {
    console.error(`Erro ao carregar versão da Bíblia "${v}":`, err);
    return null;
  }
};

// Pré-carrega NVI ao iniciar
loadBibleVersion('nvi');

const BIBLE_VERSIONS = [
  { id: 'nvi', name: 'NVI', fullName: 'Nova Versão Internacional' },
  { id: 'acf', name: 'ACF', fullName: 'Almeida Corrigida Fiel' },
  { id: 'aa', name: 'AA', fullName: 'Almeida Atualizada' }
];

/**
 * GET /api/bible/versions
 * Retorna as versões disponíveis da Bíblia
 */
router.get('/versions', (req, res) => {
  res.json({ versions: BIBLE_VERSIONS });
});

/**
 * GET /api/bible/books
 * Retorna metadados dos 66 livros da Bíblia
 */
router.get('/books', (req, res) => {
  const bible = loadBibleVersion('nvi');
  if (!bible) {
    return res.status(500).json({ error: 'Base de dados bíblica não disponível.' });
  }

  const books = bible.map((b, idx) => ({
    id: idx + 1,
    abbrev: b.abbrev.toLowerCase(),
    name: b.name,
    testament: idx < 39 ? 'VT' : 'NT',
    testamentName: idx < 39 ? 'Antigo Testamento' : 'Novo Testamento',
    chaptersCount: b.chapters.length
  }));

  res.json({ books });
});

/**
 * GET /api/bible/:version/:bookAbbr/:chapter
 * Retorna o texto completo do capítulo selecionado
 */
router.get('/:version/:bookAbbr/:chapter', (req, res) => {
  const { version = 'nvi', bookAbbr, chapter } = req.params;
  const bible = loadBibleVersion(version);

  if (!bible) {
    return res.status(404).json({ error: `Versão bíblica "${version}" não encontrada.` });
  }

  const bookIndex = bible.findIndex(
    (b) => b.abbrev.toLowerCase() === bookAbbr.toLowerCase() || b.name.toLowerCase() === bookAbbr.toLowerCase()
  );

  if (bookIndex === -1) {
    return res.status(404).json({ error: `Livro "${bookAbbr}" não encontrado.` });
  }

  const bookData = bible[bookIndex];
  const chapNum = parseInt(chapter, 10);

  if (isNaN(chapNum) || chapNum < 1 || chapNum > bookData.chapters.length) {
    return res.status(400).json({
      error: `Capítulo inválido. O livro "${bookData.name}" possui de 1 a ${bookData.chapters.length} capítulos.`
    });
  }

  const versesArray = bookData.chapters[chapNum - 1] || [];
  const formattedVerses = versesArray.map((text, idx) => ({
    number: idx + 1,
    text: typeof text === 'string' ? text.trim() : (text.text || '')
  }));

  res.json({
    version: version.toUpperCase(),
    book: {
      id: bookIndex + 1,
      abbrev: bookData.abbrev,
      name: bookData.name,
      testament: bookIndex < 39 ? 'VT' : 'NT',
      totalChapters: bookData.chapters.length
    },
    chapter: chapNum,
    totalVerses: formattedVerses.length,
    verses: formattedVerses
  });
});

/**
 * GET /api/bible/search?q=termo&version=nvi&limit=50
 * Busca textual em toda a Bíblia
 */
router.get('/search', (req, res) => {
  const { q, version = 'nvi', limit = 50 } = req.query;

  if (!q || q.trim().length < 3) {
    return res.status(400).json({ error: 'Informe um termo de busca com pelo menos 3 caracteres.' });
  }

  const bible = loadBibleVersion(version);
  if (!bible) {
    return res.status(404).json({ error: 'Versão bíblica não encontrada.' });
  }

  const query = q.toLowerCase().trim();
  const maxResults = Math.min(parseInt(limit, 10) || 50, 100);
  const results = [];

  for (let bIndex = 0; bIndex < bible.length; bIndex++) {
    const book = bible[bIndex];
    for (let cIndex = 0; cIndex < book.chapters.length; cIndex++) {
      const chapter = book.chapters[cIndex];
      for (let vIndex = 0; vIndex < chapter.length; vIndex++) {
        const verseText = chapter[vIndex];
        if (typeof verseText === 'string' && verseText.toLowerCase().includes(query)) {
          results.push({
            book: book.name,
            abbrev: book.abbrev,
            chapter: cIndex + 1,
            verse: vIndex + 1,
            text: verseText
          });

          if (results.length >= maxResults) break;
        }
      }
      if (results.length >= maxResults) break;
    }
    if (results.length >= maxResults) break;
  }

  res.json({
    query: q,
    version: version.toUpperCase(),
    total: results.length,
    results
  });
});

module.exports = router;
