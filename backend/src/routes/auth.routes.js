const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Realiza autenticação com verificação bcrypt e gera JWT
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
  }

  try {
    const user = await db.getAsync('SELECT * FROM users WHERE username = ?', [username.trim()]);

    if (!user) {
      // Registra tentativa falha nos logs de acesso
      await db.runAsync(
        'INSERT INTO access_logs (username, action, ip_address, user_agent) VALUES (?, ?, ?, ?)',
        [username.trim(), 'login_failed', ip, userAgent]
      );
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique o usuário e senha.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      await db.runAsync(
        'INSERT INTO access_logs (username, action, ip_address, user_agent) VALUES (?, ?, ?, ?)',
        [username.trim(), 'login_failed', ip, userAgent]
      );
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique o usuário e senha.' });
    }

    // Registra login bem-sucedido nos logs
    await db.runAsync(
      'INSERT INTO access_logs (username, action, ip_address, user_agent) VALUES (?, ?, ?, ?)',
      [user.username, 'login_success', ip, userAgent]
    );

    // Geração do token JWT
    const secret = process.env.JWT_SECRET || 'church_super_secret_jwt_key_2026_secure';
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    const token = jwt.sign(payload, secret, { expiresIn: '24h' });

    return res.json({
      message: 'Login realizado com sucesso.',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro interno no servidor ao processar o login.' });
  }
});

/**
 * GET /api/auth/me
 * Retorna dados do usuário atualmente autenticado
 */
router.get('/me', authMiddleware, (req, res) => {
  return res.json({ user: req.user });
});

/**
 * POST /api/auth/logout
 * Registra o logout nos logs e finaliza a sessão
 */
router.post('/logout', authMiddleware, async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  try {
    await db.runAsync(
      'INSERT INTO access_logs (username, action, ip_address, user_agent) VALUES (?, ?, ?, ?)',
      [req.user.username, 'logout', ip, userAgent]
    );
    return res.json({ message: 'Logout realizado com sucesso.' });
  } catch (error) {
    console.error('Erro no logout:', error);
    return res.status(500).json({ error: 'Erro ao processar logout.' });
  }
});

module.exports = router;
