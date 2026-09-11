const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/roles');

/**
 * GET /api/plugins
 * Retorna todos os plugins cadastrados (nativos e customizados)
 */
router.get('/', async (req, res) => {
  try {
    const plugins = await db.allAsync(
      'SELECT id, name, package_name, description, category, is_native, is_enabled, cdn_url, created_at FROM plugins ORDER BY is_native DESC, name ASC'
    );
    return res.json({ plugins });
  } catch (error) {
    console.error('Erro ao listar plugins:', error);
    return res.status(500).json({ error: 'Erro ao listar plugins.' });
  }
});

// A partir daqui, rotas protegidas (admin ou editor)
router.use(authMiddleware);
router.use(roleMiddleware(['admin', 'editor']));

/**
 * POST /api/plugins
 * Cadastra um novo plugin customizado da comunidade
 */
router.post('/', async (req, res) => {
  const { name, package_name, description, category, cdn_url } = req.body;

  if (!name || !package_name) {
    return res.status(400).json({ error: 'Nome e identificador do plugin (package_name) são obrigatórios.' });
  }

  const cleanPackage = package_name.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-');

  try {
    const existing = await db.getAsync('SELECT id FROM plugins WHERE package_name = ?', [cleanPackage]);
    if (existing) {
      return res.status(400).json({ error: `Já existe um plugin cadastrado com o identificador "${cleanPackage}".` });
    }

    const result = await db.runAsync(
      `INSERT INTO plugins (name, package_name, description, category, is_native, is_enabled, cdn_url)
       VALUES (?, ?, ?, ?, 0, 1, ?)`,
      [name.trim(), cleanPackage, description || '', category || 'Comunidade', cdn_url || '']
    );

    const createdPlugin = await db.getAsync('SELECT * FROM plugins WHERE id = ?', [result.lastID]);

    return res.status(201).json({
      message: `Plugin "${name}" adicionado com sucesso!`,
      plugin: createdPlugin
    });
  } catch (error) {
    console.error('Erro ao cadastrar plugin:', error);
    return res.status(500).json({ error: 'Erro ao cadastrar plugin.' });
  }
});

/**
 * PUT /api/plugins/:id/toggle
 * Ativa ou desativa um plugin no editor
 */
router.put('/:id/toggle', async (req, res) => {
  const { id } = req.params;

  try {
    const plugin = await db.getAsync('SELECT * FROM plugins WHERE id = ?', [id]);
    if (!plugin) {
      return res.status(404).json({ error: 'Plugin não encontrado.' });
    }

    const newStatus = plugin.is_enabled ? 0 : 1;
    await db.runAsync('UPDATE plugins SET is_enabled = ? WHERE id = ?', [newStatus, id]);

    const updated = await db.getAsync('SELECT * FROM plugins WHERE id = ?', [id]);

    return res.json({
      message: `Plugin "${plugin.name}" ${newStatus ? 'ativado' : 'desativado'} com sucesso.`,
      plugin: updated
    });
  } catch (error) {
    console.error('Erro ao alternar status do plugin:', error);
    return res.status(500).json({ error: 'Erro ao atualizar status do plugin.' });
  }
});

/**
 * DELETE /api/plugins/:id
 * Exclui um plugin (com proteção total para plugins nativos)
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const plugin = await db.getAsync('SELECT * FROM plugins WHERE id = ?', [id]);
    if (!plugin) {
      return res.status(404).json({ error: 'Plugin não encontrado.' });
    }

    // REGRA DE PROTEÇÃO: Plugins nativos não podem ser excluídos
    if (plugin.is_native === 1) {
      return res.status(400).json({
        error: `O plugin "${plugin.name}" é nativo do sistema e está protegido contra exclusão. Você pode apenas desativá-lo caso não queira utilizá-lo.`
      });
    }

    await db.runAsync('DELETE FROM plugins WHERE id = ?', [id]);

    return res.json({
      message: `Plugin "${plugin.name}" removido com sucesso.`
    });
  } catch (error) {
    console.error('Erro ao remover plugin:', error);
    return res.status(500).json({ error: 'Erro ao remover plugin.' });
  }
});

module.exports = router;
