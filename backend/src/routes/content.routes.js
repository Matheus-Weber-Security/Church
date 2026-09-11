const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/roles');

/**
 * GET /api/content/public
 * Rota pública consumida pela Home (página principal) do site Church
 */
router.get('/public', async (req, res) => {
  try {
    const items = await db.allAsync(
      'SELECT * FROM home_content WHERE published = 1 ORDER BY order_index ASC, id ASC'
    );
    return res.json({ items });
  } catch (error) {
    console.error('Erro ao buscar conteúdos públicos:', error);
    return res.status(500).json({ error: 'Erro ao carregar conteúdo da página inicial.' });
  }
});

// A partir daqui, rotas protegidas (admin ou editor podem gerenciar os conteúdos)
router.use(authMiddleware);
router.use(roleMiddleware(['admin', 'editor']));

/**
 * GET /api/content
 * Retorna todos os itens (rascunhos e publicados) para o painel de edição
 */
router.get('/', async (req, res) => {
  try {
    const items = await db.allAsync(
      'SELECT * FROM home_content ORDER BY order_index ASC, id ASC'
    );
    return res.json({ items });
  } catch (error) {
    console.error('Erro ao listar itens de conteúdo:', error);
    return res.status(500).json({ error: 'Erro ao listar conteúdos.' });
  }
});

/**
 * POST /api/content
 * Cria um novo card, foto, texto ou banner
 */
router.post('/', async (req, res) => {
  const { type, title, description, image_url, order_index, published } = req.body;

  if (!type) {
    return res.status(400).json({ error: 'O tipo de conteúdo é obrigatório (card, photo, text, banner).' });
  }

  try {
    const nextOrder = order_index !== undefined ? Number(order_index) : 0;
    const isPublished = published !== undefined ? (published ? 1 : 0) : 1;

    const result = await db.runAsync(
      `INSERT INTO home_content (type, title, description, image_url, order_index, published)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [type, title || '', description || '', image_url || '', nextOrder, isPublished]
    );

    const createdItem = await db.getAsync('SELECT * FROM home_content WHERE id = ?', [result.lastID]);

    return res.status(201).json({
      message: 'Conteúdo adicionado com sucesso.',
      item: createdItem
    });
  } catch (error) {
    console.error('Erro ao adicionar conteúdo:', error);
    return res.status(500).json({ error: 'Erro ao salvar conteúdo.' });
  }
});

/**
 * PUT /api/content/:id
 * Atualiza um item existente
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { type, title, description, image_url, order_index, published } = req.body;

  try {
    const existing = await db.getAsync('SELECT * FROM home_content WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Conteúdo não encontrado.' });
    }

    const updatedType = type || existing.type;
    const updatedTitle = title !== undefined ? title : existing.title;
    const updatedDesc = description !== undefined ? description : existing.description;
    const updatedImg = image_url !== undefined ? image_url : existing.image_url;
    const updatedOrder = order_index !== undefined ? Number(order_index) : existing.order_index;
    const updatedPub = published !== undefined ? (published ? 1 : 0) : existing.published;

    await db.runAsync(
      `UPDATE home_content 
       SET type = ?, title = ?, description = ?, image_url = ?, order_index = ?, published = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [updatedType, updatedTitle, updatedDesc, updatedImg, updatedOrder, updatedPub, id]
    );

    const updatedItem = await db.getAsync('SELECT * FROM home_content WHERE id = ?', [id]);

    return res.json({
      message: 'Conteúdo atualizado com sucesso.',
      item: updatedItem
    });
  } catch (error) {
    console.error('Erro ao atualizar conteúdo:', error);
    return res.status(500).json({ error: 'Erro ao atualizar item.' });
  }
});

/**
 * DELETE /api/content/:id
 * Remove um item do conteúdo da Home
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await db.getAsync('SELECT * FROM home_content WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Conteúdo não encontrado.' });
    }

    await db.runAsync('DELETE FROM home_content WHERE id = ?', [id]);
    return res.json({ message: 'Conteúdo removido com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar conteúdo:', error);
    return res.status(500).json({ error: 'Erro ao remover item.' });
  }
});

module.exports = router;
