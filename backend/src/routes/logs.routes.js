const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/roles');

router.use(authMiddleware);
router.use(roleMiddleware(['admin']));

/**
 * GET /api/logs
 * Retorna os registros de auditoria e acesso ao sistema
 */
router.get('/', async (req, res) => {
  try {
    const logs = await db.allAsync(
      'SELECT id, username, action, ip_address, user_agent, timestamp FROM access_logs ORDER BY id DESC LIMIT 100'
    );
    return res.json({ logs });
  } catch (error) {
    console.error('Erro ao consultar logs:', error);
    return res.status(500).json({ error: 'Erro ao carregar logs de acesso.' });
  }
});

/**
 * DELETE /api/logs
 * Limpa os logs de acesso (apenas admin)
 */
router.delete('/', async (req, res) => {
  try {
    await db.runAsync('DELETE FROM access_logs');
    return res.json({ message: 'Histórico de logs limpo com sucesso.' });
  } catch (error) {
    console.error('Erro ao limpar logs:', error);
    return res.status(500).json({ error: 'Erro ao limpar logs.' });
  }
});

module.exports = router;
