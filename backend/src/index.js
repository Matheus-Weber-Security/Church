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

// Middlewares globais - Configuração universal de CORS e Preflight OPTIONS
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Responde imediatamente a qualquer requisição Preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

const uploadDir = process.env.UPLOADS_PATH || path.resolve(__dirname, '../uploads');
if (!require('fs').existsSync(uploadDir)) {
  require('fs').mkdirSync(uploadDir, { recursive: true });
}

// Servir arquivos estáticos de uploads de imagens com suporte a CORS
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  next();
}, express.static(uploadDir));

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
  const localManual = path.resolve(__dirname, '../manual_do_usuario.html');
  const rootManual = path.resolve(__dirname, '../../manual_do_usuario.html');
  const fileToSend = require('fs').existsSync(localManual) ? localManual : rootManual;
  res.sendFile(fileToSend);
});

// Inicialização do servidor após carregar tabelas do banco
initDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=============================================`);
    console.log(`🚀 Servidor Church Backend rodando na porta ${PORT}`);
    console.log(`🔗 API Base: http://localhost:${PORT}/api`);
    console.log(`=============================================`);
  });
}).catch((err) => {
  console.error('Falha crítica ao iniciar banco de dados:', err);
});
