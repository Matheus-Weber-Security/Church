const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/roles');

/**
 * GET /api/page
 * Lista todas as páginas disponíveis para o seletor de páginas do GrapesJS
 */
router.get('/', async (req, res) => {
  try {
    let pages = await db.allAsync(
      'SELECT id, slug, title, updated_at FROM site_pages ORDER BY id ASC'
    );

    // Garante que a página 'home' sempre exista na listagem
    const hasHome = pages.some((p) => p.slug === 'home');
    if (!hasHome) {
      await db.runAsync(
        'INSERT OR IGNORE INTO site_pages (slug, title, html, css) VALUES (?, ?, ?, ?)',
        ['home', 'Página Principal (Home)', '', '']
      );
      pages = await db.allAsync(
        'SELECT id, slug, title, updated_at FROM site_pages ORDER BY id ASC'
      );
    }

    return res.json({ pages });
  } catch (error) {
    console.error('Erro ao listar páginas:', error);
    return res.status(500).json({ error: 'Erro ao listar páginas.' });
  }
});

/**
 * POST /api/page/create
 * Cria uma nova página no sistema (ex: 'sobre', 'cultos', 'eventos')
 */
router.post('/create', authMiddleware, roleMiddleware(['admin', 'editor']), async (req, res) => {
  const { title, slug } = req.body;

  if (!title || !slug) {
    return res.status(400).json({ error: 'Título e slug da página são obrigatórios.' });
  }

  // Sanitiza o slug: minúsculas, apenas letras, números e hifens
  const cleanSlug = slug
    .toLowerCase()
    .trim()
    .replace(/^\//, '')
    .replace(/[^a-z0-9-]/g, '-');

  if (cleanSlug.length < 2) {
    return res.status(400).json({ error: 'O slug deve conter no mínimo 2 caracteres válidos.' });
  }

  if (cleanSlug === 'edit' || cleanSlug === 'api') {
    return res.status(400).json({ error: `O slug "${cleanSlug}" é reservado pelo sistema.` });
  }

  try {
    const existing = await db.getAsync('SELECT id FROM site_pages WHERE slug = ?', [cleanSlug]);
    if (existing) {
      return res.status(400).json({ error: `Já existe uma página com o slug "${cleanSlug}".` });
    }

    await db.runAsync(
      `INSERT INTO site_pages (slug, title, html, css, project_data, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [cleanSlug, title.trim(), '', '', '']
    );

    const newPage = await db.getAsync('SELECT id, slug, title, updated_at FROM site_pages WHERE slug = ?', [cleanSlug]);

    return res.status(201).json({
      message: `Página "${title}" criada com sucesso!`,
      page: newPage
    });
  } catch (error) {
    console.error('Erro ao criar página:', error);
    return res.status(500).json({ error: 'Erro ao cadastrar página.' });
  }
});

/**
 * DELETE /api/page/:slug
 * Exclui uma página criada (protegendo a Home para não ser deletada)
 */
router.delete('/:slug', authMiddleware, roleMiddleware(['admin', 'editor']), async (req, res) => {
  const { slug } = req.params;

  if (slug === 'home') {
    return res.status(400).json({ error: 'A página principal "home" não pode ser excluída.' });
  }

  try {
    const existing = await db.getAsync('SELECT id FROM site_pages WHERE slug = ?', [slug]);
    if (!existing) {
      return res.status(404).json({ error: 'Página não encontrada.' });
    }

    await db.runAsync('DELETE FROM site_pages WHERE slug = ?', [slug]);
    return res.json({ message: `Página "${slug}" excluída com sucesso.` });
  } catch (error) {
    console.error('Erro ao excluir página:', error);
    return res.status(500).json({ error: 'Erro ao remover página.' });
  }
});

/**
 * GET /api/page/:slug
 * Obtém os dados completos (HTML, CSS, ProjectData) de uma página
 */
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const page = await db.getAsync(
      'SELECT slug, title, html, css, project_data, updated_at FROM site_pages WHERE slug = ?',
      [slug]
    );

    if (!page) {
      return res.json({
        slug,
        title: slug.toUpperCase(),
        html: '',
        css: '',
        project_data: null,
        exists: false
      });
    }

    return res.json({
      ...page,
      exists: true
    });
  } catch (error) {
    console.error(`Erro ao carregar página ${slug}:`, error);
    return res.status(500).json({ error: 'Erro ao carregar conteúdo da página.' });
  }
});

/**
 * POST /api/page/:slug
 * Salva o layout (HTML, CSS, ProjectData) de uma página
 */
router.post('/:slug', authMiddleware, roleMiddleware(['admin', 'editor']), async (req, res) => {
  const { slug } = req.params;
  const { html, css, project_data, title } = req.body;

  try {
    const existing = await db.getAsync('SELECT id FROM site_pages WHERE slug = ?', [slug]);

    if (existing) {
      await db.runAsync(
        `UPDATE site_pages 
         SET html = ?, css = ?, project_data = ?, title = COALESCE(?, title), updated_at = CURRENT_TIMESTAMP
         WHERE slug = ?`,
        [html || '', css || '', project_data || '', title || null, slug]
      );
    } else {
      await db.runAsync(
        `INSERT INTO site_pages (slug, title, html, css, project_data, updated_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [slug, title || slug, html || '', css || '', project_data || '']
      );
    }

    return res.json({
      message: 'Página salva com sucesso no banco de dados.',
      slug,
      saved_at: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Erro ao salvar página ${slug}:`, error);
    return res.status(500).json({ error: 'Erro ao salvar alterações da página.' });
  }
});

module.exports = router;
