const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/roles');

// Todas as rotas de usuários requerem autenticação e permissão de admin
router.use(authMiddleware);
router.use(roleMiddleware(['admin']));

/**
 * GET /api/users
 * Lista todos os usuários cadastrados
 */
router.get('/', async (req, res) => {
  try {
    const users = await db.allAsync(
      'SELECT id, username, role, created_at FROM users ORDER BY created_at DESC'
    );
    return res.json({ users });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
});

/**
 * POST /api/users
 * Cria um novo usuário com role especificada (admin ou editor)
 */
router.post('/', async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
  }

  const cleanUsername = username.trim();
  const selectedRole = role === 'admin' ? 'admin' : 'editor';

  if (password.length < 4) {
    return res.status(400).json({ error: 'A senha deve conter no mínimo 4 caracteres.' });
  }

  try {
    const existing = await db.getAsync('SELECT id FROM users WHERE username = ?', [cleanUsername]);
    if (existing) {
      return res.status(400).json({ error: 'Já existe um usuário cadastrado com este nome.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const result = await db.runAsync(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [cleanUsername, passwordHash, selectedRole]
    );

    const newUser = await db.getAsync(
      'SELECT id, username, role, created_at FROM users WHERE id = ?',
      [result.lastID]
    );

    return res.status(201).json({
      message: 'Usuário criado com sucesso.',
      user: newUser
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return res.status(500).json({ error: 'Erro ao cadastrar usuário.' });
  }
});

/**
 * PUT /api/users/:id
 * Atualiza role ou senha de um usuário existente
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { role, password } = req.body;

  try {
    const user = await db.getAsync('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    let query = 'UPDATE users SET role = ?';
    const params = [role === 'admin' ? 'admin' : 'editor'];

    if (password && password.trim().length >= 4) {
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(password.trim(), salt);
      query += ', password_hash = ?';
      params.push(passwordHash);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await db.runAsync(query, params);

    const updatedUser = await db.getAsync(
      'SELECT id, username, role, created_at FROM users WHERE id = ?',
      [id]
    );

    return res.json({
      message: 'Usuário atualizado com sucesso.',
      user: updatedUser
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
});

/**
 * DELETE /api/users/:id
 * Remove um usuário do sistema
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const targetUser = await db.getAsync('SELECT * FROM users WHERE id = ?', [id]);
    if (!targetUser) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Impede deletar a si mesmo ou o usuário root primordial
    if (req.user.id === targetUser.id) {
      return res.status(400).json({ error: 'Você não pode excluir sua própria conta enquanto estiver logado.' });
    }

    if (targetUser.username === 'root') {
      return res.status(400).json({ error: 'O usuário root principal do sistema não pode ser excluído.' });
    }

    await db.runAsync('DELETE FROM users WHERE id = ?', [id]);

    return res.json({ message: `Usuário "${targetUser.username}" excluído com sucesso.` });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    return res.status(500).json({ error: 'Erro ao excluir usuário.' });
  }
});

module.exports = router;
