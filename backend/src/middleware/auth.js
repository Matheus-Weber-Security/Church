const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido ou inválido.' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'church_super_secret_jwt_key_2026_secure';

    const decoded = jwt.verify(token, secret);
    
    // Busca usuário no banco de dados para garantir que ainda é válido
    const user = await db.getAsync(
      'SELECT id, username, role, created_at FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user) {
      return res.status(401).json({ error: 'Usuário associado ao token não foi encontrado.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
    }
    return res.status(401).json({ error: 'Token inválido ou não autorizado.' });
  }
};

module.exports = authMiddleware;
