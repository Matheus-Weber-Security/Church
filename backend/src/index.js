require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./config/database');

const path = require('path');
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const contentRoutes = require('./routes/content.routes');
const logsRoutes = require('./routes/logs.routes');
const pageRoutes = require('./routes/pages.routes');
const uploadsRoutes = require('./routes/uploads.routes');
const pluginsRoutes = require('./routes/plugins.routes');
const aiRoutes = require('./routes/ai.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares globais
app.use(cors({
  origin: '*', // Permite conexão do frontend em qualquer porta Vite
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Servir arquivos estáticos de uploads de imagens
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/page', pageRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/plugins', pluginsRoutes);
app.use('/api/ai', aiRoutes);

// Endpoint de verificação de integridade do backend
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Church Backend API',
    timestamp: new Date().toISOString()
  });
});

// Servir a Apostila/Manual do Usuário em HTML/PDF
app.get('/manual', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../../manual_do_usuario.html'));
});

// Inicialização do servidor após carregar tabelas do banco
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`=============================================`);
    console.log(`🚀 Servidor Church Backend rodando na porta ${PORT}`);
    console.log(`🔗 API Base: http://localhost:${PORT}/api`);
    console.log(`=============================================`);
  });
}).catch((err) => {
  console.error('Falha crítica ao iniciar banco de dados:', err);
});
